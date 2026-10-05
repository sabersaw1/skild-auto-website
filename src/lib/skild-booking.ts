// Browser-side handoff between /quote → /schedule → /confirm.
// Stores the persisted Supabase quoteId so the customer never re-enters info.

const KEY_QUOTE = "skild.booking.quoteId";
const KEY_SLOT = "skild.booking.slot";

export function setQuoteId(id: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY_QUOTE, id);
}
export function getQuoteId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY_QUOTE);
}
export function setSlot(iso: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY_SLOT, iso);
}
export function getSlot(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(KEY_SLOT);
}
/** One key per (quote, time): pressing Submit twice, retrying or going back sends the same key,
 *  so the server returns the same booking instead of making a second one. */
const KEY_IDEM = "skild.booking.idem";
export function getIdempotencyKey(quoteId: string, slot: string): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  const want = `${quoteId}|${slot}`;
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY_IDEM) || "null") as {
      for: string;
      key: string;
    } | null;
    if (saved && saved.for === want) return saved.key;
  } catch {
    /* ignore broken storage */
  }
  const key = crypto.randomUUID();
  window.sessionStorage.setItem(KEY_IDEM, JSON.stringify({ for: want, key }));
  return key;
}
export function clearBooking() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY_QUOTE);
  window.sessionStorage.removeItem(KEY_SLOT);
  window.sessionStorage.removeItem(KEY_IDEM);
}

export const APPOINTMENT_MINUTES = 60;
