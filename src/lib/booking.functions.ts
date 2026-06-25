// Customer-facing booking server functions. Use the service-role Supabase
// client because anon callers must read business_hours/blocked_times and
// (privately) check appointment conflicts. We never return appointment
// PII — only free/busy slot booleans.
//
// Provider-agnostic: getAvailableSlots merges Supabase appointments +
// blocked_times. To layer Google Calendar later, add a second provider
// and union its busy ranges before slot filtering.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { APPOINTMENT_MINUTES } from "./skild-booking";

const SLOT_MINUTES = 30; // grid resolution
const DEFAULT_APPT_MIN = APPOINTMENT_MINUTES;

function parseHMS(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return { h: h || 0, m: m || 0 };
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadAvailability(fromISO: string, toISO: string) {
  const { getSkildAdmin } = await import("./skild-supabase.server");
  const sb = getSkildAdmin();
  const [hoursRes, blockedRes, apptsRes] = await Promise.all([
    sb.from("business_hours").select("weekday, open_time, close_time, is_open"),
    sb
      .from("blocked_times")
      .select("start_at, end_at")
      .lt("start_at", toISO)
      .gt("end_at", fromISO),
    sb
      .from("appointments")
      .select("start_at, end_at, status")
      .lt("start_at", toISO)
      .gt("end_at", fromISO)
      .neq("status", "cancelled"),
  ]);
  if (hoursRes.error) throw hoursRes.error;
  if (blockedRes.error) throw blockedRes.error;
  if (apptsRes.error) throw apptsRes.error;
  return {
    hours: hoursRes.data ?? [],
    busy: [
      ...(blockedRes.data ?? []).map((b) => ({ start: new Date(b.start_at), end: new Date(b.end_at) })),
      ...(apptsRes.data ?? []).map((a) => ({ start: new Date(a.start_at), end: new Date(a.end_at) })),
    ],
  };
}

function dayWindowFromHours(date: Date, hours: { weekday: number; open_time: string; close_time: string; is_open: boolean }[]) {
  const row = hours.find((h) => h.weekday === date.getDay());
  if (!row || !row.is_open) return null;
  const o = parseHMS(row.open_time);
  const c = parseHMS(row.close_time);
  const open = new Date(date);
  open.setHours(o.h, o.m, 0, 0);
  const close = new Date(date);
  close.setHours(c.h, c.m, 0, 0);
  return { open, close };
}

function slotsForDay(date: Date, win: { open: Date; close: Date }, busy: { start: Date; end: Date }[]) {
  const slots: string[] = [];
  const now = Date.now();
  const apptMs = DEFAULT_APPT_MIN * 60_000;
  const stepMs = SLOT_MINUTES * 60_000;
  for (let t = win.open.getTime(); t + apptMs <= win.close.getTime(); t += stepMs) {
    const start = t;
    const end = t + apptMs;
    if (start < now + 2 * 60 * 60_000) continue; // require 2h lead time
    const conflict = busy.some((b) => b.start.getTime() < end && b.end.getTime() > start);
    if (!conflict) slots.push(new Date(start).toISOString());
  }
  return slots;
}

// ─────────────────────────────────────────────────────────────────────────
export const getAvailableDays = createServerFn({ method: "POST" })
  .inputValidator((d: { from?: string; days?: number }) =>
    z.object({ from: z.string().optional(), days: z.number().min(1).max(60).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const start = data.from ? new Date(data.from) : new Date();
    start.setHours(0, 0, 0, 0);
    const span = data.days ?? 21;
    const end = new Date(start);
    end.setDate(end.getDate() + span);
    const { hours, busy } = await loadAvailability(start.toISOString(), end.toISOString());

    const days: { date: string; hasSlots: boolean }[] = [];
    for (let i = 0; i < span; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const win = dayWindowFromHours(d, hours);
      if (!win) {
        days.push({ date: ymd(d), hasSlots: false });
        continue;
      }
      const s = slotsForDay(d, win, busy);
      days.push({ date: ymd(d), hasSlots: s.length > 0 });
    }
    return { days };
  });

export const getAvailableSlots = createServerFn({ method: "POST" })
  .inputValidator((d: { date: string }) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const day = new Date(`${data.date}T00:00:00`);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const { hours, busy } = await loadAvailability(day.toISOString(), next.toISOString());
    const win = dayWindowFromHours(day, hours);
    if (!win) return { slots: [] };
    return { slots: slotsForDay(day, win, busy) };
  });

// ─────────────────────────────────────────────────────────────────────────
// Create appointment + send Resend email. Re-checks conflict to prevent
// double booking (anon callers race).
export const createAppointment = createServerFn({ method: "POST" })
  .inputValidator((d: { quoteId: string; startISO: string }) =>
    z.object({ quoteId: z.string().uuid(), startISO: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { getSkildAdmin } = await import("./skild-supabase.server");
    const sb = getSkildAdmin();
    const start = new Date(data.startISO);
    const end = new Date(start.getTime() + DEFAULT_APPT_MIN * 60_000);

    // Load the quote (so we can link customer/vehicle + build email).
    const { data: quote, error: qErr } = await sb
      .from("quotes")
      .select("id, customer_id, vehicle_id, requested_service, description, notes, summary")
      .eq("id", data.quoteId)
      .single();
    if (qErr || !quote) throw new Error("Quote not found");

    // Conflict re-check.
    const { data: conflicts, error: cErr } = await sb
      .from("appointments")
      .select("id")
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString())
      .neq("status", "cancelled");
    if (cErr) throw cErr;
    if (conflicts && conflicts.length > 0) {
      return { ok: false as const, error: "That slot was just taken — please pick another." };
    }

    const { data: appt, error: aErr } = await sb
      .from("appointments")
      .insert({
        customer_id: quote.customer_id,
        quote_id: quote.id,
        vehicle_id: quote.vehicle_id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "pending",
      })
      .select("id")
      .single();
    if (aErr || !appt) throw aErr ?? new Error("Insert failed");

    // Mark quote as scheduled.
    await sb.from("quotes").update({ status: "scheduled" }).eq("id", quote.id);

    // Fire email (best-effort).
    try {
      const { sendBookingEmails } = await import("./skild-email.server");
      await sendBookingEmails(appt.id);
    } catch (err) {
      console.error("[createAppointment] email failed", err);
    }

    return { ok: true as const, appointmentId: appt.id };
  });
