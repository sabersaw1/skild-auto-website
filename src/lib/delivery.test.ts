import { describe, expect, it } from "vitest";
import { withRetry } from "./delivery";

const noSleep = async () => {};

describe("email/calendar delivery never loses a booking", () => {
  it("succeeds on a later attempt", async () => {
    let n = 0;
    const r = await withRetry(async () => ++n >= 2, { sleep: noSleep });
    expect(r).toEqual({ ok: true, attempts: 2 });
  });
  it("gives up after 3 tries without throwing and records why", async () => {
    const r = await withRetry(
      async () => {
        throw new Error("Google 503");
      },
      { sleep: noSleep },
    );
    expect(r.ok).toBe(false);
    expect(r.attempts).toBe(3);
    expect(r.error).toContain("Google 503");
  });
  it("treats a false result as a failure", async () => {
    const r = await withRetry(async () => false, { attempts: 2, sleep: noSleep });
    expect(r).toMatchObject({ ok: false, attempts: 2 });
  });
});
