// Sends the customer's quote to skildauto@gmail.com via Resend.
//
// Critically: the server fetches each Cloudinary photo URL and attaches
// the raw image bytes to the email so the recipient gets real downloadable
// attachments in Gmail (vehicle_photo_1.jpg, etc.) — not just hyperlinks.
//
// Required env:
//   RESEND_API_KEY     — from https://resend.com/api-keys
// Optional env:
//   QUOTE_TO_EMAIL     — defaults to skildauto@gmail.com
//   QUOTE_FROM_EMAIL   — defaults to "Skild Auto <onboarding@resend.dev>"
//
// Public route (/api/public/*) so the unauthenticated quote form can call
// it. No PII is returned and the payload is the customer's own data.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB / photo cap
const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB total (Resend allows ~40)

type IncomingPhoto = {
  url?: string;
  secureUrl?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  originalFilename?: string;
};

type Payload = {
  submittedAt?: string;
  customer?: Record<string, string>;
  vehicle?: Record<string, string>;
  service?: Record<string, string>;
  photos?: IncomingPhoto[];
  summary?: string;
  booking?: Record<string, string>;
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeFilename(name: string, fallbackExt: string, idx: number): string {
  const cleaned = (name || "")
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (cleaned && /\.[a-z0-9]+$/i.test(cleaned)) return cleaned.slice(0, 80);
  const stem = cleaned || `vehicle_photo_${idx + 1}`;
  return `${stem}.${(fallbackExt || "jpg").toLowerCase()}`.slice(0, 80);
}

function isAllowedPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

async function fetchAsBase64(url: string): Promise<{ base64: string; contentType: string; bytes: number }> {
  if (!isAllowedPhotoUrl(url)) {
    throw new Error("Disallowed photo URL");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error(`photo exceeds ${MAX_ATTACHMENT_BYTES} bytes`);
  }
  // base64 encode in chunks to avoid call-stack overflow on big files
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return {
    base64: btoa(binary),
    contentType: res.headers.get("content-type") || "image/jpeg",
    bytes: buf.byteLength,
  };
}

export const Route = createFileRoute("/api/public/send-quote")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const TO = process.env.QUOTE_TO_EMAIL || "skildauto@gmail.com";
        const FROM = process.env.QUOTE_FROM_EMAIL || "Skild Auto <onboarding@resend.dev>";

        if (!RESEND_API_KEY) {
          return Response.json(
            { ok: false, error: "RESEND_API_KEY not configured" },
            { status: 200, headers: CORS },
          );
        }

        let p: Payload;
        try {
          p = (await request.json()) as Payload;
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON" },
            { status: 200, headers: CORS },
          );
        }

        const c = p.customer ?? {};
        const v = p.vehicle ?? {};
        const s = p.service ?? {};
        const b = p.booking ?? {};
        const MAX_PHOTOS = 10;
        const rawPhotos = Array.isArray(p.photos) ? p.photos : [];
        const photos = rawPhotos.slice(0, MAX_PHOTOS).filter((ph) => {
          const url = ph?.secureUrl || ph?.url;
          return !!url && isAllowedPhotoUrl(url);
        });

        // Best-effort Supabase persistence. Failures are logged but never
        // block the customer email — Cloudinary + Resend stay the critical
        // path. Supabase is the source of truth once the row lands.
        let quoteId: string | null = null;
        try {
          const { hasSupabase, persistQuoteToSupabase } = await import(
            "@/lib/skild-quote-store.server"
          );
          if (hasSupabase()) {
            const res = await persistQuoteToSupabase({
              customer: c as never,
              vehicle: v as never,
              service: s as never,
              summary: p.summary,
              photos: photos as never,
            });
            quoteId = res.quoteId;
            console.info("[send-quote] persisted to Supabase", res);
          } else {
            console.warn(
              "[send-quote] SKILD_SUPABASE_SERVICE_ROLE_KEY missing — skipping persistence",
            );
          }
        } catch (err) {
          console.error(
            "[send-quote] Supabase persistence failed (continuing)",
            err,
          );
        }

        // Fetch every Cloudinary URL server-side and convert to a Resend
        // attachment. If one fails we log and continue — the email still
        // ships with the rest.
        const attachments: { filename: string; content: string; content_type: string }[] = [];
        let totalBytes = 0;
        const failures: string[] = [];

        for (let i = 0; i < photos.length; i++) {
          const ph = photos[i];
          const url = ph.secureUrl || ph.url;
          if (!url) continue;
          try {
            const { base64, contentType, bytes } = await fetchAsBase64(url);
            if (totalBytes + bytes > MAX_TOTAL_BYTES) {
              failures.push(`${ph.originalFilename || url} (total size cap)`);
              continue;
            }
            totalBytes += bytes;
            attachments.push({
              filename: safeFilename(ph.originalFilename || "", ph.format || "jpg", i),
              content: base64,
              content_type: contentType,
            });
          } catch (err) {
            console.error("[send-quote] photo fetch failed", { url, err });
            failures.push(ph.originalFilename || url);
          }
        }

        const subject = `New Skild Auto quote — ${c.fullName || "Customer"} · ${s.requested || "Service"}`;

        const photoListHtml = photos.length
          ? `<ul style="margin:8px 0 0;padding-left:18px;font-family:Arial,sans-serif;font-size:13px;color:#fff">
              ${photos.map((ph) => `<li><a href="${esc(ph.secureUrl || ph.url)}" style="color:#dc1e28">${esc(ph.originalFilename || ph.publicId)}</a></li>`).join("")}
             </ul>`
          : "";

        const photoBlock = photos.length
          ? `<h3 style="margin:24px 0 8px;font-family:Arial,sans-serif;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Photos</h3>
             <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#fff">
               ${attachments.length} of ${photos.length} attached to this email${failures.length ? ` · ${failures.length} could not be attached` : ""}.
               Cloudinary originals:
             </p>
             ${photoListHtml}`
          : `<p style="font-family:Arial,sans-serif;font-size:13px;color:#888">No photos uploaded.</p>`;

        const bookingBlock = b && (b.startTime || b.eventUri || b.notes)
          ? `<h3 style="margin:24px 0 8px;font-family:Arial,sans-serif;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Booking</h3>
             <table style="font-family:Arial,sans-serif;font-size:14px;color:#fff;border-collapse:collapse">
               ${b.startTime ? `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">When</td><td>${esc(b.startTime)}</td></tr>` : ""}
               ${b.eventUri ? `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Event</td><td><a style="color:#fff" href="${esc(b.eventUri)}">${esc(b.eventUri)}</a></td></tr>` : ""}
               ${b.notes ? `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Notes</td><td>${esc(b.notes)}</td></tr>` : ""}
             </table>`
          : "";

        const html = `
          <div style="background:#0a0608;padding:24px;font-family:Arial,sans-serif;color:#fff">
            <div style="max-width:640px;margin:0 auto;background:#141014;border:1px solid #2a1f24;border-radius:12px;padding:28px">
              <h1 style="margin:0 0 4px;font-size:22px">New quote request</h1>
              <p style="margin:0;color:#9b8e94;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Skild Auto · ${esc(new Date(p.submittedAt || Date.now()).toLocaleString())}</p>

              <h3 style="margin:24px 0 8px;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Customer</h3>
              <table style="font-size:14px;color:#fff;border-collapse:collapse">
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Name</td><td>${esc(c.fullName)}</td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Phone</td><td><a href="tel:${esc(c.phone)}" style="color:#fff">${esc(c.phone)}</a></td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Email</td><td><a href="mailto:${esc(c.email)}" style="color:#fff">${esc(c.email)}</a></td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Location</td><td>${esc(c.location)}</td></tr>
              </table>

              <h3 style="margin:24px 0 8px;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Vehicle</h3>
              <table style="font-size:14px;color:#fff;border-collapse:collapse">
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Type</td><td>${esc(v.type === "moto" ? "Motorcycle" : v.type === "auto" ? "Automotive" : "—")}</td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Year</td><td>${esc(v.year)}</td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Make</td><td>${esc(v.make)}</td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Model</td><td>${esc(v.model)}</td></tr>
                <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Mileage</td><td>${esc(v.mileage)}</td></tr>
              </table>

              <h3 style="margin:24px 0 8px;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Service request</h3>
              <p style="margin:0;font-size:14px"><strong>${esc(s.requested)}</strong></p>
              <p style="margin:8px 0 0;font-size:14px;white-space:pre-wrap">${esc(s.description) || "<em>No description</em>"}</p>
              ${s.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#9b8e94;white-space:pre-wrap"><strong>Notes:</strong> ${esc(s.notes)}</p>` : ""}

              ${bookingBlock}
              ${photoBlock}
            </div>
          </div>`;

        const text =
          (p.summary || "") +
          (photos.length
            ? `\n\nPhotos:\n${photos.map((ph) => ph.secureUrl || ph.url).join("\n")}`
            : "");

        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: FROM,
            to: [TO],
            reply_to: c.email || undefined,
            subject,
            html,
            text,
            attachments: attachments.length ? attachments : undefined,
          }),
        });

        if (!resendRes.ok) {
          const err = await resendRes.text().catch(() => "");
          console.error("[send-quote] resend failed", { status: resendRes.status, err });
          return Response.json(
            { ok: false, error: "Failed to send quote notification. Please try again." },
            { status: 200, headers: CORS },
          );
        }

        const data = (await resendRes.json()) as { id?: string };
        return Response.json(
          {
            ok: true,
            id: data.id,
            quoteId,
            attached: attachments.length,
            attachmentFailures: failures,
          },
          { headers: CORS },
        );
      },
    },
  },
});
