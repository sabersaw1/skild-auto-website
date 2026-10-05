import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("add-to-calendar file", () => {
  const ics = buildIcs({
    uid: "appt-123",
    startISO: "2026-11-02T15:00:00.000Z",
    endISO: "2026-11-02T16:00:00.000Z",
    summary: "Skild Auto: brakes, 2015 Toyota Camry",
    description: "Your Skild Auto technician comes to you.\nQuestions? 801-584-9804",
    location: "123 Main St, Salt Lake City, UT",
    now: new Date("2026-10-05T00:00:00Z"),
  });
  it("uses UTC times so every phone shows the right local time", () => {
    expect(ics).toContain("DTSTART:20261102T150000Z");
    expect(ics).toContain("DTEND:20261102T160000Z");
  });
  it("escapes commas and new lines and uses CRLF line endings", () => {
    expect(ics).toContain("SUMMARY:Skild Auto: brakes\\, 2015 Toyota Camry");
    expect(ics).toContain("comes to you.\\nQuestions?");
    expect(ics.split("\r\n").length).toBeGreaterThan(10);
  });
  it("folds lines longer than 75 characters", () => {
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });
  it("has one event with a stable id", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:appt-123@skildauto.com");
  });
});
