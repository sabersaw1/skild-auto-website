// Booking rules (server-only). Defaults come from Skild Auto's Company Records (Johnny HQ):
// minimum notice 2 h, 30-min travel buffer between jobs, 60-min jobs on a 30-min grid.
// They can be changed without a deploy in Supabase: business_settings, key "booking", e.g.
//   {"min_notice_minutes": 120, "travel_buffer_minutes": 30, "appointment_minutes": 60,
//    "busy_calendar_ids": ["technician@gmail.com"]}
// busy_calendar_ids = extra Google calendars whose free/busy blocks booking (the technician's,
// shared with skildauto@gmail.com). Unknown or bad values fall back to the defaults.

import { DEFAULT_RULES, type SlotRules } from "./slots";

export type BookingSettings = SlotRules & { busyCalendarIds: string[] };

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : fallback;
}

export function parseBookingSettings(value: unknown): BookingSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const ids = Array.isArray(v.busy_calendar_ids)
    ? v.busy_calendar_ids.filter((x): x is string => typeof x === "string" && x.length < 200)
    : [];
  return {
    appointmentMinutes: num(v.appointment_minutes, DEFAULT_RULES.appointmentMinutes, 15, 480),
    stepMinutes: num(v.slot_step_minutes, DEFAULT_RULES.stepMinutes, 5, 120),
    minNoticeMinutes: num(v.min_notice_minutes, DEFAULT_RULES.minNoticeMinutes, 0, 7 * 24 * 60),
    travelBufferMinutes: num(v.travel_buffer_minutes, DEFAULT_RULES.travelBufferMinutes, 0, 240),
    busyCalendarIds: ids.slice(0, 5),
  };
}

export async function loadBookingSettings(): Promise<BookingSettings> {
  try {
    const { getSkildAdmin } = await import("./skild-supabase.server");
    const { data } = await getSkildAdmin()
      .from("business_settings")
      .select("value")
      .eq("key", "booking")
      .maybeSingle();
    return parseBookingSettings(data?.value);
  } catch {
    return parseBookingSettings(null);
  }
}
