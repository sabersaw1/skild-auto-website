// Sends the completed quote to the Supabase Edge Function that emails
// skildauto@gmail.com. Email composition + delivery (Resend) live in
// supabase/functions/send-quote-notification/index.ts so credentials
// never touch the client and the system stays portable to GitHub,
// Vercel, Neon, and Skild OS.

import {
  SKILD_QUOTE_NOTIFY_URL,
  skildSupabaseAnonKey,
} from "./skild-supabase";
import {
  quoteSummary,
  resolvedMake,
  resolvedModel,
  type QuoteData,
} from "./quote-storage";

const SUBMITTED_FLAG = "skild.quote.submitted";

export function markQuoteSubmitted(id: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SUBMITTED_FLAG, id);
}
export function wasQuoteSubmitted(id: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SUBMITTED_FLAG) === id;
}

export type SubmitPayload = {
  submittedAt: string;
  customer: {
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    email: string;
    location: string;
  };
  vehicle: {
    type: "auto" | "moto" | null;
    year: string;
    make: string;
    model: string;
    mileage: string;
  };
  service: {
    requested: string;
    description: string;
    notes: string;
  };
  photos: string[]; // public URLs
  summary: string; // pre-rendered text block
};

export function buildPayload(q: QuoteData): SubmitPayload {
  return {
    submittedAt: new Date().toISOString(),
    customer: {
      firstName: q.firstName,
      lastName: q.lastName,
      fullName: [q.firstName, q.lastName].filter(Boolean).join(" "),
      phone: q.phone,
      email: q.email,
      location: q.location,
    },
    vehicle: {
      type: q.type,
      year: q.year,
      make: resolvedMake(q),
      model: resolvedModel(q),
      mileage: q.mileage,
    },
    service: {
      requested: q.service,
      description: q.description,
      notes: q.notes,
    },
    photos: q.photos,
    summary: quoteSummary(q),
  };
}

export async function submitQuote(q: QuoteData): Promise<void> {
  const payload = buildPayload(q);

  const res = await fetch(SKILD_QUOTE_NOTIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Supabase Edge Functions require the anon key by default.
      apikey: skildSupabaseAnonKey,
      Authorization: `Bearer ${skildSupabaseAnonKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Quote notification failed (${res.status}): ${text}`);
  }
}
