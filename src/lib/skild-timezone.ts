// Shared timezone constants/helpers for Skild Auto scheduling.
// The shop operates in Salt Lake City; all business-hour math and customer-
// facing time formatting MUST be anchored to this zone so server (UTC on
// Vercel), admin browser, and customer browser all show the same wall time.

export const BUSINESS_TIMEZONE = "America/Denver";

/** Format an ISO timestamp in the business's local time zone. */
export function formatInBusinessZone(
  iso: string | Date,
  opts: Intl.DateTimeFormatOptions,
): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", { timeZone: BUSINESS_TIMEZONE, ...opts });
}

function zoneParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour % 24,
    minute: +map.minute,
    second: +map.second,
  };
}

function tzOffsetMs(date: Date, timeZone: string) {
  const p = zoneParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

/** Convert a wall-clock time in the business zone to a UTC Date. */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string = BUSINESS_TIMEZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  // Compute offset using the guessed instant; refine once for DST edges.
  const offset1 = tzOffsetMs(new Date(utcGuess), timeZone);
  const refined = utcGuess - offset1;
  const offset2 = tzOffsetMs(new Date(refined), timeZone);
  return new Date(utcGuess - offset2);
}

/** YYYY-MM-DD for the given instant in the business zone. */
export function ymdInBusinessZone(date: Date = new Date()): string {
  const p = zoneParts(date, BUSINESS_TIMEZONE);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" → {y,m,d}. */
export function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return { y, m, d };
}

/** Add N days to a YMD string, returning a YMD string (calendar arithmetic). */
export function addDaysYmd(ymd: string, days: number): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** 0=Sun..6=Sat for the given YMD (calendar day, no timezone needed). */
export function weekdayForYmd(ymd: string): number {
  const { y, m, d } = parseYmd(ymd);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
