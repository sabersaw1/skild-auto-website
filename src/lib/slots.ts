// Pure slot math for Skild Auto booking (no I/O, fully unit-tested in slots.test.ts).
// All wall-clock math is anchored to America/Denver, so DST changes
// (Nov 1 2026, Mar 14 2027, ...) are handled by the zone rules, never by hand.

import { BUSINESS_TIMEZONE, parseYmd, weekdayForYmd, zonedWallTimeToUtc } from "./skild-timezone";

export type HoursRow = { weekday: number; open_time: string; close_time: string; is_open: boolean };
export type Busy = { start: Date; end: Date };

export type SlotRules = {
  appointmentMinutes: number; // length of a job
  stepMinutes: number; // grid resolution
  minNoticeMinutes: number; // never offer a time sooner than this
  travelBufferMinutes: number; // free time kept before and after every other job (mobile mechanic)
};

export const DEFAULT_RULES: SlotRules = {
  appointmentMinutes: 60,
  stepMinutes: 30,
  minNoticeMinutes: 120,
  travelBufferMinutes: 30,
};

function parseHMS(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return { h: h || 0, m: m || 0 };
}

/** Opening window (UTC instants) for a business-zone calendar day, or null when closed. */
export function dayWindow(ymd: string, hours: HoursRow[]): { open: Date; close: Date } | null {
  const row = hours.find((h) => h.weekday === weekdayForYmd(ymd));
  if (!row || !row.is_open) return null;
  const o = parseHMS(row.open_time);
  const c = parseHMS(row.close_time);
  const { y, m, d } = parseYmd(ymd);
  const open = zonedWallTimeToUtc(y, m, d, o.h, o.m, BUSINESS_TIMEZONE);
  const close = zonedWallTimeToUtc(y, m, d, c.h, c.m, BUSINESS_TIMEZONE);
  return close > open ? { open, close } : null;
}

/**
 * Bookable start times (ISO, UTC) for one day.
 * A start is offered only if: it's inside opening hours (job ends by closing), it's at least
 * minNotice from `now`, and the job plus a travel buffer on each side overlaps nothing busy
 * (other bookings, blocked times, the technician's calendar).
 */
export function computeSlots(
  ymd: string,
  hours: HoursRow[],
  busy: Busy[],
  now: Date,
  rules: SlotRules = DEFAULT_RULES,
): string[] {
  const win = dayWindow(ymd, hours);
  if (!win) return [];
  const appt = rules.appointmentMinutes * 60_000;
  const step = rules.stepMinutes * 60_000;
  const buffer = rules.travelBufferMinutes * 60_000;
  const earliest = now.getTime() + rules.minNoticeMinutes * 60_000;
  const out: string[] = [];
  for (let t = win.open.getTime(); t + appt <= win.close.getTime(); t += step) {
    if (t < earliest) continue;
    const s = t - buffer;
    const e = t + appt + buffer;
    if (busy.some((b) => b.start.getTime() < e && b.end.getTime() > s)) continue;
    out.push(new Date(t).toISOString());
  }
  return out;
}

/** True when `startISO` is exactly one of the offered slots (server-side re-check before saving). */
export function isOfferedSlot(
  startISO: string,
  ymd: string,
  hours: HoursRow[],
  busy: Busy[],
  now: Date,
  rules: SlotRules = DEFAULT_RULES,
): boolean {
  const t = new Date(startISO).getTime();
  if (Number.isNaN(t)) return false;
  return computeSlots(ymd, hours, busy, now, rules).some((s) => new Date(s).getTime() === t);
}
