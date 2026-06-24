// Sends the completed quote to the TanStack server route at
// /api/public/send-quote, which emails skildauto@gmail.com via Resend
// with the customer's Cloudinary photos as real downloadable
// attachments.
//
// No Supabase, no Lovable Cloud — portable across GitHub, Vercel, Neon,
// and the future Skild OS layer.

import {
  quoteSummary,
  resolvedMake,
  resolvedModel,
  type QuoteData,
} from "./quote-storage";
import type { CloudinaryPhoto } from "./cloudinary-upload";

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
  // Cloudinary references — server fetches each URL and attaches the
  // raw bytes to the email. Also the shape future Neon rows will store.
  photos: CloudinaryPhoto[];
  summary: string;
};

export function buildPayload(q: QuoteData, photos: CloudinaryPhoto[]): SubmitPayload {
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
    photos,
    summary: quoteSummary(q),
  };
}

export async function submitQuote(
  q: QuoteData,
  photos: CloudinaryPhoto[] = [],
): Promise<void> {
  const payload = buildPayload(q, photos);

  const res = await fetch("/api/public/send-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Quote notification failed (${res.status}): ${text}`);
  }
}
