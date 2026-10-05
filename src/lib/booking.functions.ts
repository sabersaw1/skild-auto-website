// Customer-facing booking server functions. Use the service-role Supabase
// client because anon callers must read business_hours/blocked_times and
// (privately) check appointment conflicts. We never return appointment
// PII — only free/busy slot booleans.
//
// All business-hour math is anchored to BUSINESS_TIMEZONE (America/Denver) and lives in
// ./slots.ts (pure, unit-tested: DST changes, notice, hours, travel buffer, busy times).
//
// Booking guarantees (Johnny HQ booking spec):
//  - a time is saved only if it is still an offered slot (server re-check)
//  - the database refuses overlapping bookings (exclusion constraint), even for same-second clicks
//  - double-clicking Submit creates one booking (idempotency key)
//  - the booking is saved FIRST; calendar + emails are retried and their outcome recorded,
//    so a customer never loses a booking because Google or email had a hiccup

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { computeSlots, isOfferedSlot, type Busy, type HoursRow } from "./slots";
import { addDaysYmd, parseYmd, ymdInBusinessZone, zonedWallTimeToUtc } from "./skild-timezone";
import { withRetry } from "./delivery";
import type { BookingSettings } from "./booking-settings.server";

async function loadAvailability(fromISO: string, toISO: string, settings: BookingSettings) {
  const { getSkildAdmin } = await import("./skild-supabase.server");
  const { getGoogleBusy } = await import("./google-calendar.server");
  const sb = getSkildAdmin();
  const [hoursRes, blockedRes, apptsRes, googleBusy] = await Promise.all([
    sb.from("business_hours").select("weekday, open_time, close_time, is_open"),
    sb.from("blocked_times").select("start_at, end_at").lt("start_at", toISO).gt("end_at", fromISO),
    sb
      .from("appointments")
      .select("start_at, end_at, status")
      .lt("start_at", toISO)
      .gt("end_at", fromISO)
      .not("status", "in", "(cancelled,no_show)"),
    getGoogleBusy(fromISO, toISO, settings.busyCalendarIds),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (blockedRes.error) throw blockedRes.error;
  if (apptsRes.error) throw apptsRes.error;
  const busy: Busy[] = [
    ...(blockedRes.data ?? []).map((b) => ({
      start: new Date(b.start_at),
      end: new Date(b.end_at),
    })),
    ...(apptsRes.data ?? []).map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) })),
    ...googleBusy,
  ];
  return { hours: (hoursRes.data ?? []) as HoursRow[], busy };
}

function dayBoundsUtc(ymd: string, days = 1) {
  const end = addDaysYmd(ymd, days);
  const a = parseYmd(ymd);
  const b = parseYmd(end);
  return {
    fromISO: zonedWallTimeToUtc(a.y, a.m, a.d, 0, 0).toISOString(),
    toISO: zonedWallTimeToUtc(b.y, b.m, b.d, 0, 0).toISOString(),
  };
}

async function settings(): Promise<BookingSettings> {
  const { loadBookingSettings } = await import("./booking-settings.server");
  return loadBookingSettings();
}

// ─────────────────────────────────────────────────────────────────────────
export const getAvailableDays = createServerFn({ method: "POST" })
  .inputValidator((d: { from?: string; days?: number }) =>
    z.object({ from: z.string().optional(), days: z.number().min(1).max(60).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const startYmd = ymdInBusinessZone(data.from ? new Date(data.from) : new Date());
    const span = data.days ?? 21;
    const rules = await settings();
    const { fromISO, toISO } = dayBoundsUtc(startYmd, span);
    const { hours, busy } = await loadAvailability(fromISO, toISO, rules);
    const now = new Date();
    const days: { date: string; hasSlots: boolean }[] = [];
    for (let i = 0; i < span; i++) {
      const ymd = addDaysYmd(startYmd, i);
      days.push({ date: ymd, hasSlots: computeSlots(ymd, hours, busy, now, rules).length > 0 });
    }
    return { days };
  });

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator((d: { date: string }) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const rules = await settings();
    const { fromISO, toISO } = dayBoundsUtc(data.date);
    const { hours, busy } = await loadAvailability(fromISO, toISO, rules);
    return {
      slots: computeSlots(data.date, hours, busy, new Date(), rules),
      minutes: rules.appointmentMinutes,
    };
  });

// ─────────────────────────────────────────────────────────────────────────
type PgError = { code?: string; message?: string } | null;
const isMissingColumn = (e: PgError) =>
  e?.code === "42703" || /column .* does not exist/i.test(e?.message ?? "");

export const createAppointment = createServerFn({ method: "POST" })
  .inputValidator((d: { quoteId: string; startISO: string; idempotencyKey?: string }) =>
    z
      .object({
        quoteId: z.string().uuid(),
        startISO: z.string().datetime(),
        idempotencyKey: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { getSkildAdmin } = await import("./skild-supabase.server");
    const sb = getSkildAdmin();

    // 1. Same submit again (double click, retry, back button): return the booking we already made.
    if (data.idempotencyKey) {
      const { data: prev, error } = await sb
        .from("appointments")
        .select("id")
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (!error && prev) return { ok: true as const, appointmentId: prev.id, duplicate: true };
    }

    const { data: quote, error: qErr } = await sb
      .from("quotes")
      .select("id, customer_id, vehicle_id, requested_service, description, notes, summary")
      .eq("id", data.quoteId)
      .single();
    if (qErr || !quote) throw new Error("Quote not found");

    // 2. Re-check against the real rules (hours, notice, travel buffer, other bookings, calendars).
    const rules = await settings();
    const start = new Date(data.startISO);
    const ymd = ymdInBusinessZone(start);
    const { fromISO, toISO } = dayBoundsUtc(ymd);
    const { hours, busy } = await loadAvailability(fromISO, toISO, rules);
    if (!isOfferedSlot(start.toISOString(), ymd, hours, busy, new Date(), rules)) {
      return {
        ok: false as const,
        error: "That time is no longer available — please pick another.",
      };
    }
    const end = new Date(start.getTime() + rules.appointmentMinutes * 60_000);

    // 3. Save the booking. The database refuses overlaps (23P01) and repeated keys (23505).
    const row: Record<string, unknown> = {
      customer_id: quote.customer_id,
      quote_id: quote.id,
      vehicle_id: quote.vehicle_id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "pending",
      ...(data.idempotencyKey ? { idempotency_key: data.idempotencyKey } : {}),
    };
    let ins = await sb.from("appointments").insert(row).select("id").single();
    if (ins.error && isMissingColumn(ins.error)) {
      // Code deployed before the database migration: save without the new column.
      delete row.idempotency_key;
      ins = await sb.from("appointments").insert(row).select("id").single();
    }
    if (ins.error?.code === "23P01") {
      return { ok: false as const, error: "That slot was just taken — please pick another." };
    }
    if (ins.error?.code === "23505" && data.idempotencyKey) {
      const { data: prev } = await sb
        .from("appointments")
        .select("id")
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (prev) return { ok: true as const, appointmentId: prev.id, duplicate: true };
    }
    if (ins.error || !ins.data) throw ins.error ?? new Error("Insert failed");
    const apptId = ins.data.id as string;

    await sb.from("quotes").update({ status: "scheduled" }).eq("id", quote.id);

    // 4. Calendar + emails: retried, never allowed to fail the booking; outcome recorded.
    const { syncAppointmentToGoogleInternal } = await import("./appointments.functions");
    const { sendBookingEmails } = await import("./skild-email.server");
    const cal = await withRetry(() => syncAppointmentToGoogleInternal(apptId));
    const pending = { admin: true, customer: true };
    const mail = await withRetry(async () => {
      const r = await sendBookingEmails(apptId, pending);
      if (r.admin) pending.admin = false;
      if (r.customer !== false) pending.customer = false;
      return !pending.admin && !pending.customer;
    });
    if (!cal.ok || !mail.ok) {
      console.error("[createAppointment] delivery incomplete", {
        appointmentId: apptId,
        calendar: cal,
        email: mail,
      });
    }
    const now = new Date().toISOString();
    const delivery = {
      calendar_synced_at: cal.ok ? now : null,
      confirmation_email_sent_at: mail.ok ? now : null,
      delivery_attempts: cal.attempts + mail.attempts,
      last_delivery_error:
        [cal.ok ? "" : `calendar: ${cal.error}`, mail.ok ? "" : `email: ${mail.error}`]
          .filter(Boolean)
          .join(" | ") || null,
    };
    const upd = await sb.from("appointments").update(delivery).eq("id", apptId);
    if (upd.error && !isMissingColumn(upd.error))
      console.error("[createAppointment] could not record delivery", upd.error);

    return { ok: true as const, appointmentId: apptId };
  });
