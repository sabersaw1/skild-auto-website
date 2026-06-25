// Persists a submitted quote into Supabase. Runs on the server only.
// Mirrors the previous Neon helper shape so callers don't change.

import { getSkildAdmin, hasSkildAdmin } from "./skild-supabase.server";

type Customer = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
};
type Vehicle = {
  type?: "auto" | "moto" | string;
  year?: string;
  make?: string;
  model?: string;
  mileage?: string;
};
type Service = { requested?: string; description?: string; notes?: string };
type PhotoRef = {
  url?: string;
  secureUrl?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  originalFilename?: string;
};

export type PersistQuoteInput = {
  customer: Customer;
  vehicle: Vehicle;
  service: Service;
  summary?: string;
  photos?: PhotoRef[];
};

export type PersistQuoteResult = {
  quoteId: string;
  customerId: string;
  vehicleId: string | null;
  photoCount: number;
};

export function hasSupabase(): boolean {
  return hasSkildAdmin();
}

export async function persistQuoteToSupabase(
  input: PersistQuoteInput,
): Promise<PersistQuoteResult> {
  const sb = getSkildAdmin();
  const c = input.customer ?? {};
  const v = input.vehicle ?? {};
  const s = input.service ?? {};

  const fullName =
    c.fullName ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    null;
  const email = (c.email || "").trim().toLowerCase() || null;
  const phone = (c.phone || "").trim() || null;

  // Upsert customer keyed on email (fallback: phone). Anonymous customers
  // with neither still create a fresh row so the lead isn't lost.
  let customerId: string;
  if (email) {
    const { data, error } = await sb
      .from("customers")
      .upsert(
        {
          email,
          full_name: fullName,
          phone,
          location: c.location || null,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (error) throw error;
    customerId = data.id as string;
  } else {
    const { data, error } = await sb
      .from("customers")
      .insert({
        full_name: fullName,
        phone,
        location: c.location || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    customerId = data.id as string;
  }

  // Vehicle (optional — only insert if there's something useful).
  let vehicleId: string | null = null;
  if (v.year || v.make || v.model) {
    const { data, error } = await sb
      .from("vehicles")
      .insert({
        customer_id: customerId,
        kind: v.type === "moto" ? "moto" : "auto",
        year: v.year ? Number(v.year) || null : null,
        make: v.make || null,
        model: v.model || null,
        mileage: v.mileage || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    vehicleId = data.id as string;
  }

  // Quote.
  const { data: quote, error: qErr } = await sb
    .from("quotes")
    .insert({
      customer_id: customerId,
      vehicle_id: vehicleId,
      requested_service: s.requested || null,
      description: s.description || null,
      notes: s.notes || null,
      summary: input.summary || null,
      status: "new",
    })
    .select("id")
    .single();
  if (qErr) throw qErr;
  const quoteId = quote.id as string;

  // Photos.
  const photos = (input.photos ?? []).filter(
    (p) => p && (p.secureUrl || p.url),
  );
  if (photos.length) {
    const rows = photos.map((p) => ({
      quote_id: quoteId,
      url: (p.secureUrl || p.url) as string,
      public_id: p.publicId || null,
      format: p.format || null,
      bytes: p.bytes ?? null,
      original_filename: p.originalFilename || null,
    }));
    const { error: pErr } = await sb.from("quote_photos").insert(rows);
    if (pErr) throw pErr;
  }

  return {
    quoteId,
    customerId,
    vehicleId,
    photoCount: photos.length,
  };
}
