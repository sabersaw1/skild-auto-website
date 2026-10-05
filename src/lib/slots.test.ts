import { describe, expect, it } from "vitest";
import {
  computeSlots,
  dayWindow,
  isOfferedSlot,
  DEFAULT_RULES,
  type HoursRow,
  type SlotRules,
} from "./slots";

// Test hours: every day 08:00–20:00 (Sunday 08:00–12:00), so DST Sundays can be tested too.
const HOURS: HoursRow[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  open_time: "08:00:00",
  close_time: weekday === 0 ? "12:00:00" : "20:00:00",
  is_open: true,
}));
const LONG_AGO = new Date("2026-01-01T00:00:00Z");
const NO_BUFFER: SlotRules = { ...DEFAULT_RULES, travelBufferMinutes: 0 };

describe("Mountain time", () => {
  it("8:00 AM in Salt Lake on a summer-time day is 14:00 UTC", () => {
    expect(computeSlots("2026-10-06", HOURS, [], LONG_AGO)[0]).toBe("2026-10-06T14:00:00.000Z");
  });
  it("the last start lets the job end by closing (7:00 PM start for an 8:00 PM close)", () => {
    const slots = computeSlots("2026-10-06", HOURS, [], LONG_AGO);
    expect(slots.at(-1)).toBe("2026-10-07T01:00:00.000Z"); // 19:00 MDT
    expect(slots).toHaveLength(23); // 8:00 … 19:00 every 30 min
  });
});

describe("clock changes", () => {
  it("Nov 1 2026 (fall back): Saturday 8 AM is MDT, Sunday 8 AM is MST", () => {
    expect(computeSlots("2026-10-31", HOURS, [], LONG_AGO)[0]).toBe("2026-10-31T14:00:00.000Z");
    expect(computeSlots("2026-11-01", HOURS, [], LONG_AGO)[0]).toBe("2026-11-01T15:00:00.000Z");
    expect(computeSlots("2026-11-02", HOURS, [], LONG_AGO)[0]).toBe("2026-11-02T15:00:00.000Z");
  });
  it("Nov 1 2026: the short Sunday window still has exactly 4 hours of starts", () => {
    expect(computeSlots("2026-11-01", HOURS, [], LONG_AGO)).toHaveLength(7); // 8:00 … 11:00
  });
  it("Mar 14 2027 (spring forward): Saturday 8 AM is MST, Sunday 8 AM is MDT", () => {
    expect(computeSlots("2027-03-13", HOURS, [], LONG_AGO)[0]).toBe("2027-03-13T15:00:00.000Z");
    expect(computeSlots("2027-03-14", HOURS, [], LONG_AGO)[0]).toBe("2027-03-14T14:00:00.000Z");
  });
  it("opening window length stays 12 h across the change", () => {
    for (const d of ["2026-10-31", "2026-11-02", "2027-03-13", "2027-03-15"]) {
      const w = dayWindow(d, HOURS)!;
      expect(w.close.getTime() - w.open.getTime()).toBe(12 * 3600_000);
    }
  });
});

describe("hours, notice, past", () => {
  it("closed days offer nothing", () => {
    const closedSunday = HOURS.map((h) => (h.weekday === 0 ? { ...h, is_open: false } : h));
    expect(computeSlots("2026-10-04", closedSunday, [], LONG_AGO)).toEqual([]);
  });
  it("never offers anything sooner than the minimum notice (2 h)", () => {
    const now = new Date("2026-10-06T15:30:00Z"); // 9:30 AM MDT
    expect(computeSlots("2026-10-06", HOURS, [], now)[0]).toBe("2026-10-06T17:30:00.000Z"); // 11:30 AM
  });
  it("never offers past times (after closing → nothing today)", () => {
    const now = new Date("2026-10-07T03:00:00Z"); // 9 PM MDT
    expect(computeSlots("2026-10-06", HOURS, [], now)).toEqual([]);
  });
  it("respects a longer job length", () => {
    const slots = computeSlots("2026-10-06", HOURS, [], LONG_AGO, {
      ...NO_BUFFER,
      appointmentMinutes: 120,
    });
    expect(slots.at(-1)).toBe("2026-10-07T00:00:00.000Z"); // 18:00 start ends 20:00
  });
});

describe("busy times and travel buffer", () => {
  const busy = [{ start: new Date("2026-10-06T16:00:00Z"), end: new Date("2026-10-06T17:00:00Z") }]; // 10–11 AM MDT
  const mdt = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 6, h + 6, m)).toISOString();

  it("no buffer: only overlapping starts are removed", () => {
    const s = computeSlots("2026-10-06", HOURS, busy, LONG_AGO, NO_BUFFER);
    expect(s).toContain(mdt(9));
    expect(s).not.toContain(mdt(9, 30));
    expect(s).not.toContain(mdt(10, 30));
    expect(s).toContain(mdt(11));
  });
  it("30-min travel buffer keeps a gap before and after other jobs", () => {
    const s = computeSlots("2026-10-06", HOURS, busy, LONG_AGO);
    expect(s).toContain(mdt(8, 30)); // ends 9:30, +30 min = 10:00 → fits
    expect(s).not.toContain(mdt(9)); // ends 10:00, needs travel until 10:30
    expect(s).not.toContain(mdt(11)); // starts right as the other job ends: no travel time
    expect(s).toContain(mdt(11, 30));
  });
  it("the technician's calendar busy time blocks just like a booking", () => {
    const techBusy = [
      { start: new Date("2026-10-06T20:00:00Z"), end: new Date("2026-10-06T22:00:00Z") },
    ]; // 2–4 PM
    const s = computeSlots("2026-10-06", HOURS, techBusy, LONG_AGO);
    expect(s).not.toContain(mdt(14));
    expect(s).not.toContain(mdt(15, 30));
    expect(s).toContain(mdt(16, 30));
  });
});

describe("server-side re-check", () => {
  const busy = [{ start: new Date("2026-10-06T16:00:00Z"), end: new Date("2026-10-06T17:00:00Z") }];
  it("accepts an offered slot", () => {
    expect(isOfferedSlot("2026-10-06T14:00:00.000Z", "2026-10-06", HOURS, busy, LONG_AGO)).toBe(
      true,
    );
  });
  it("rejects off-grid, busy, and garbage times", () => {
    expect(isOfferedSlot("2026-10-06T14:15:00.000Z", "2026-10-06", HOURS, busy, LONG_AGO)).toBe(
      false,
    );
    expect(isOfferedSlot("2026-10-06T16:00:00.000Z", "2026-10-06", HOURS, busy, LONG_AGO)).toBe(
      false,
    );
    expect(isOfferedSlot("not-a-date", "2026-10-06", HOURS, busy, LONG_AGO)).toBe(false);
  });
});
