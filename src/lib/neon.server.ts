// Neon serverless client — Cloudflare Workers compatible.
// Server-only; never import from client/route modules at top level.
// Load lazily inside handlers: `const { getDb } = await import('@/lib/neon.server')`.

import { neon } from "@neondatabase/serverless";

let _schemaReady: Promise<void> | null = null;

export function hasNeon(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  return neon(url);
}

/**
 * First-call DDL. Idempotent. Schema mirrors the spec:
 *   customers, vehicles, quotes, photos, appointments.
 * Keeps Neon as the source of truth and Cloudinary as media storage.
 */
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    const sql = getSql();
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name   text,
        last_name    text,
        full_name    text,
        phone        text,
        email        text,
        location     text,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (lower(email))`;
    await sql`CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone)`;

    await sql`
      CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id  uuid REFERENCES customers(customer_id) ON DELETE CASCADE,
        vehicle_type text,
        year         text,
        make         text,
        model        text,
        mileage      text,
        created_at   timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        quote_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id       uuid REFERENCES customers(customer_id) ON DELETE CASCADE,
        vehicle_id        uuid REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
        service_requested text,
        description       text,
        notes             text,
        summary           text,
        status            text NOT NULL DEFAULT 'submitted',
        submitted_at      timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS quotes_customer_idx ON quotes (customer_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS photos (
        photo_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id      uuid REFERENCES quotes(quote_id) ON DELETE CASCADE,
        url           text NOT NULL,
        secure_url    text,
        public_id     text,
        file_name     text,
        format        text,
        bytes         bigint,
        width         int,
        height        int,
        uploaded_at   timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS photos_quote_idx ON photos (quote_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS appointments (
        appointment_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id         uuid REFERENCES quotes(quote_id) ON DELETE SET NULL,
        provider         text NOT NULL DEFAULT 'calendly',
        event_uri        text,
        invitee_uri      text UNIQUE,
        invitee_email    text,
        invitee_name     text,
        start_time       timestamptz,
        end_time         timestamptz,
        status           text,
        raw_payload      jsonb,
        created_at       timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS appointments_email_idx ON appointments (lower(invitee_email))`;
  })().catch((err) => {
    _schemaReady = null; // allow retry on next call
    throw err;
  });
  return _schemaReady;
}

export type PersistQuoteInput = {
  customer: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    location?: string;
  };
  vehicle: {
    type?: string | null;
    year?: string;
    make?: string;
    model?: string;
    mileage?: string;
  };
  service: { requested?: string; description?: string; notes?: string };
  summary?: string;
  photos: Array<{
    url?: string;
    secureUrl?: string;
    publicId?: string;
    originalFilename?: string;
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
  }>;
};

export async function persistQuote(input: PersistQuoteInput): Promise<{
  customerId: string;
  vehicleId: string;
  quoteId: string;
}> {
  await ensureSchema();
  const sql = getSql();
  const c = input.customer;
  const v = input.vehicle;
  const s = input.service;

  const [cust] = (await sql`
    INSERT INTO customers (first_name, last_name, full_name, phone, email, location)
    VALUES (${c.firstName ?? null}, ${c.lastName ?? null}, ${c.fullName ?? null},
            ${c.phone ?? null}, ${c.email ?? null}, ${c.location ?? null})
    RETURNING customer_id
  `) as Array<{ customer_id: string }>;

  const [veh] = (await sql`
    INSERT INTO vehicles (customer_id, vehicle_type, year, make, model, mileage)
    VALUES (${cust.customer_id}, ${v.type ?? null}, ${v.year ?? null},
            ${v.make ?? null}, ${v.model ?? null}, ${v.mileage ?? null})
    RETURNING vehicle_id
  `) as Array<{ vehicle_id: string }>;

  const [quote] = (await sql`
    INSERT INTO quotes (customer_id, vehicle_id, service_requested, description, notes, summary)
    VALUES (${cust.customer_id}, ${veh.vehicle_id},
            ${s.requested ?? null}, ${s.description ?? null}, ${s.notes ?? null},
            ${input.summary ?? null})
    RETURNING quote_id
  `) as Array<{ quote_id: string }>;

  if (input.photos?.length) {
    for (const p of input.photos) {
      await sql`
        INSERT INTO photos (quote_id, url, secure_url, public_id, file_name, format, bytes, width, height)
        VALUES (${quote.quote_id}, ${p.url ?? p.secureUrl ?? ""}, ${p.secureUrl ?? null},
                ${p.publicId ?? null}, ${p.originalFilename ?? null}, ${p.format ?? null},
                ${p.bytes ?? null}, ${p.width ?? null}, ${p.height ?? null})
      `;
    }
  }

  return {
    customerId: cust.customer_id,
    vehicleId: veh.vehicle_id,
    quoteId: quote.quote_id,
  };
}

/** Find the most recent quote for an email — used by the Calendly webhook
 *  to attach the appointment to the correct quote. */
export async function findRecentQuoteIdByEmail(email: string): Promise<string | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT q.quote_id
    FROM quotes q
    JOIN customers c ON c.customer_id = q.customer_id
    WHERE lower(c.email) = lower(${email})
    ORDER BY q.submitted_at DESC
    LIMIT 1
  `) as Array<{ quote_id: string }>;
  return rows[0]?.quote_id ?? null;
}

export async function recordAppointment(input: {
  quoteId: string | null;
  eventUri?: string;
  inviteeUri?: string;
  inviteeEmail?: string;
  inviteeName?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  rawPayload?: unknown;
}): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO appointments
      (quote_id, event_uri, invitee_uri, invitee_email, invitee_name,
       start_time, end_time, status, raw_payload)
    VALUES
      (${input.quoteId}, ${input.eventUri ?? null}, ${input.inviteeUri ?? null},
       ${input.inviteeEmail ?? null}, ${input.inviteeName ?? null},
       ${input.startTime ?? null}, ${input.endTime ?? null},
       ${input.status ?? null},
       ${input.rawPayload ? JSON.stringify(input.rawPayload) : null}::jsonb)
    ON CONFLICT (invitee_uri) DO UPDATE SET
      status = EXCLUDED.status,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      raw_payload = EXCLUDED.raw_payload
  `;
}
