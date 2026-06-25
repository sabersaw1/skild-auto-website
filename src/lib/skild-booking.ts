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
export function clearBooking() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY_QUOTE);
  window.sessionStorage.removeItem(KEY_SLOT);
}

export const APPOINTMENT_MINUTES = 60;
