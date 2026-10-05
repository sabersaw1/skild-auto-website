// Admin-side appointment mutations that keep Google Calendar in sync.
// Called from the admin Appointments page so status changes also reach
// Google Calendar (cancel = delete, reschedule = patch).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function loadAppointmentForSync(id: string) {
  const { getSkildAdmin } = await import("./skild-supabase.server");
  const sb = getSkildAdmin();
  const { data, error } = await sb
    .from("appointments")
    .select(
      `id, start_at, end_at, status, notes, google_event_id, location,
       customer:customer_id(full_name, email, phone, location),
       vehicle:vehicle_id(year, make, model),
       quote:quote_id(requested_service, description)`,
    )
    .eq("id", id)
    .single();
  if (error || !data) throw error ?? new Error("Appointment not found");
  return data as unknown as {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    notes: string | null;
    google_event_id: string | null;
    location: string | null;
    customer: { full_name: string | null; email: string | null; phone: string | null; location: string | null } | null;
    vehicle: { year: number | null; make: string | null; model: string | null } | null;
    quote: { requested_service: string | null; description: string | null } | null;
  };
}

function eventInputFor(a: Awaited<ReturnType<typeof loadAppointmentForSync>>) {
  const vehicle = [a.vehicle?.year, a.vehicle?.make, a.vehicle?.model].filter(Boolean).join(" ");
  const lines = [
    `Customer: ${a.customer?.full_name || "—"}`,
    `Phone: ${a.customer?.phone || "—"}`,
    `Email: ${a.customer?.email || "—"}`,
    `Vehicle: ${vehicle || "—"}`,
    `Service: ${a.quote?.requested_service || "—"}`,
  ];
  if (a.quote?.description) lines.push("", "Notes:", a.quote.description);
  lines.push("", "CRM: https://www.skildauto.com/admin/appointments");
  return {
    summary: `Skild Auto — ${a.customer?.full_name || "Appointment"} (${a.quote?.requested_service || "Service"})`,
    description: lines.join("\n"),
    startISO: a.start_at,
    endISO: a.end_at,
    location: a.customer?.location || a.location || "Salt Lake City, UT",
    attendeeEmail: a.customer?.email || undefined,
  };
}

/**
 * Create/update the Google Calendar event for a booking. Server-only (called by createAppointment);
 * returns true when the event exists in Google afterwards. Never throws.
 */
export async function syncAppointmentToGoogleInternal(appointmentId: string): Promise<boolean> {
  const a = await loadAppointmentForSync(appointmentId);
  const { createGoogleEvent, updateGoogleEvent, isGoogleConnected } = await import("./google-calendar.server");
  if (!(await isGoogleConnected())) return false;
  const input = eventInputFor(a);
  if (a.google_event_id) return await updateGoogleEvent(a.google_event_id, input);
  const ev = await createGoogleEvent(input);
  if (!ev) return false;
  const { getSkildAdmin } = await import("./skild-supabase.server");
  await getSkildAdmin().from("appointments").update({ google_event_id: ev.eventId }).eq("id", a.id);
  return true;
}

// Admin-only (the admin UI's "sync to Google" button). Always requires the admin's token:
// before, a missing token skipped the check, so anyone could trigger a sync.
export const syncAppointmentToGoogle = createServerFn({ method: "POST" })
  .inputValidator((d: { appointmentId: string; accessToken: string }) =>
    z.object({ appointmentId: z.string().uuid(), accessToken: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const ok = await syncAppointmentToGoogleInternal(data.appointmentId);
    return ok ? { ok: true as const } : { ok: false as const };
  });

export const setAppointmentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { appointmentId: string; status: string; accessToken: string }) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        accessToken: z.string().min(20),
        status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { getSkildAdmin } = await import("./skild-supabase.server");
    const sb = getSkildAdmin();
    const a = await loadAppointmentForSync(data.appointmentId);
    await sb.from("appointments").update({ status: data.status }).eq("id", a.id);

    const { deleteGoogleEvent, createGoogleEvent, updateGoogleEvent, isGoogleConnected } =
      await import("./google-calendar.server");
    if (!(await isGoogleConnected())) return { ok: true as const, synced: false };

    if (data.status === "cancelled") {
      if (a.google_event_id) {
        await deleteGoogleEvent(a.google_event_id);
        await sb.from("appointments").update({ google_event_id: null }).eq("id", a.id);
      }
      return { ok: true as const, synced: true };
    }

    const input = eventInputFor({ ...a, status: data.status });
    if (a.google_event_id) {
      await updateGoogleEvent(a.google_event_id, input);
    } else {
      const ev = await createGoogleEvent(input);
      if (ev) await sb.from("appointments").update({ google_event_id: ev.eventId }).eq("id", a.id);
    }
    return { ok: true as const, synced: true };
  });

export const rescheduleAppointment = createServerFn({ method: "POST" })
  .inputValidator((d: { appointmentId: string; startISO: string; minutes?: number; accessToken: string }) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        accessToken: z.string().min(20),
        startISO: z.string(),
        minutes: z.number().min(15).max(480).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireSkildAdmin } = await import("./admin-guard.server");
    await requireSkildAdmin(data.accessToken);
    const { getSkildAdmin } = await import("./skild-supabase.server");
    const sb = getSkildAdmin();
    const a = await loadAppointmentForSync(data.appointmentId);
    const start = new Date(data.startISO);
    const mins = data.minutes ?? 60;
    const end = new Date(start.getTime() + mins * 60_000);

    await sb
      .from("appointments")
      .update({ start_at: start.toISOString(), end_at: end.toISOString() })
      .eq("id", a.id);

    const { updateGoogleEvent, createGoogleEvent, isGoogleConnected } = await import(
      "./google-calendar.server"
    );
    if (!(await isGoogleConnected())) return { ok: true as const, synced: false };
    const input = eventInputFor({
      ...a,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
    });
    if (a.google_event_id) {
      await updateGoogleEvent(a.google_event_id, input);
    } else {
      const ev = await createGoogleEvent(input);
      if (ev) await sb.from("appointments").update({ google_event_id: ev.eventId }).eq("id", a.id);
    }
    return { ok: true as const, synced: true };
  });
