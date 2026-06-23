// Persists the in-progress Skild Auto quote so the customer never
// re-enters information. Saved to sessionStorage on the client only.

import type { VehicleKind } from "./vehicles";

export type QuoteData = {
  type: VehicleKind | null;
  service: string;
  year: string;
  make: string;
  makeOther: string;
  model: string;
  modelOther: string;
  mileage: string;
  description: string;
  notes: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  location: string;
  photos: string[]; // optional URLs / data refs
};

export const EMPTY_QUOTE: QuoteData = {
  type: null,
  service: "",
  year: "",
  make: "",
  makeOther: "",
  model: "",
  modelOther: "",
  mileage: "",
  description: "",
  notes: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  location: "",
  photos: [],
};

const KEY = "skild.quote.v1";

export function loadQuote(): QuoteData {
  if (typeof window === "undefined") return EMPTY_QUOTE;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY_QUOTE;
    return { ...EMPTY_QUOTE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_QUOTE;
  }
}

export function saveQuote(data: QuoteData) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export function clearQuote() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function resolvedMake(q: QuoteData): string {
  return q.make === "Other" ? q.makeOther || "Other" : q.make;
}
export function resolvedModel(q: QuoteData): string {
  return q.model === "Other" ? q.modelOther || "Other" : q.model;
}

/** Builds a human-readable summary block used by Calendly notes / email. */
export function quoteSummary(q: QuoteData): string {
  const make = resolvedMake(q);
  const model = resolvedModel(q);
  const lines = [
    `Customer name: ${[q.firstName, q.lastName].filter(Boolean).join(" ") || "—"}`,
    `Customer phone: ${q.phone || "—"}`,
    `Customer email: ${q.email || "—"}`,
    `Location: ${q.location || "—"}`,
    `Vehicle type: ${q.type ? (q.type === "moto" ? "Motorcycle" : "Automotive") : "—"}`,
    `Year: ${q.year || "—"}`,
    `Make: ${make || "—"}`,
    `Model: ${model || "—"}`,
    `Mileage: ${q.mileage || "—"}`,
    `Requested service: ${q.service || "—"}`,
    `Problem description: ${q.description || "—"}`,
    `Additional notes: ${q.notes || "—"}`,
  ];
  if (q.photos.length) lines.push(`Photo links: ${q.photos.join(", ")}`);
  return lines.join("\n");
}
