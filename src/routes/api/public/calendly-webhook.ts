// Calendly webhook receiver.
//
// 1. Persists the appointment in Neon, linking it to the most recent quote
//    from the same email when possible.
// 2. Sends a follow-up email to skildauto@gmail.com so the booking time
//    arrives alongside the original quote — no manual Calendly lookup.
//
// Setup (one-time, manual at Calendly):
//   curl -X POST https://api.calendly.com/webhook_subscriptions \
//     -H "Authorization: Bearer $CALENDLY_PERSONAL_ACCESS_TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{
//       "url": "https://<your-domain>/api/public/calendly-webhook",
//       "events": ["invitee.created", "invitee.canceled"],
//       "organization": "<org-uri>",
//       "scope": "user",
//       "user": "<user-uri>",
//       "signing_key": "<random-32+ char string, save as CALENDLY_WEBHOOK_SIGNING_KEY>"
//     }'
//
// Required env (optional — webhook is a best-effort enhancement):
//   CALENDLY_WEBHOOK_SIGNING_KEY  — for HMAC verification
//   RESEND_API_KEY                — to send the follow-up email
//   DATABASE_URL                  — to persist the appointment

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Calendly-Webhook-Signature",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function verifySignature(
  rawBody: string,
  header: string | null,
  signingKey: string,
): Promise<boolean> {
  if (!header) return false;
  // Calendly header format: t=<unix>,v1=<hex hmac sha256>
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim()) as [string, string]),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject signatures older than 5 minutes
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe compare
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/calendly-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

        if (!signingKey) {
          console.error(
            "[calendly-webhook] CALENDLY_WEBHOOK_SIGNING_KEY not configured — rejecting",
          );
          return new Response("Webhook not configured", { status: 503, headers: CORS });
        }
        const ok = await verifySignature(
          rawBody,
          request.headers.get("calendly-webhook-signature"),
          signingKey,
        );
        if (!ok) {
          console.warn("[calendly-webhook] signature verification failed");
          return new Response("Invalid signature", { status: 401, headers: CORS });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: CORS });
        }

        const event = payload?.event as string | undefined;
        const p = payload?.payload ?? {};
        const inviteeEmail: string | undefined = p?.email;
        const inviteeName: string | undefined = p?.name;
        const inviteeUri: string | undefined = p?.uri;
        const scheduled = p?.scheduled_event ?? {};
        const eventUri: string | undefined = scheduled?.uri;
        const startTime: string | undefined = scheduled?.start_time;
        const endTime: string | undefined = scheduled?.end_time;
        const status: string =
          event === "invitee.canceled" ? "canceled" : (scheduled?.status ?? "active");

        // Persist (best-effort) and find matching quote
        let quoteId: string | null = null;
        try {
          const { hasNeon, findRecentQuoteIdByEmail, recordAppointment } =
            await import("@/lib/neon.server");
          if (hasNeon()) {
            if (inviteeEmail) quoteId = await findRecentQuoteIdByEmail(inviteeEmail);
            await recordAppointment({
              quoteId,
              eventUri,
              inviteeUri,
              inviteeEmail,
              inviteeName,
              startTime,
              endTime,
              status,
              rawPayload: payload,
            });
          }
        } catch (err) {
          console.error("[calendly-webhook] Neon persist failed (continuing)", err);
        }

        // Follow-up email so the booking lands in skildauto@gmail.com
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const TO = process.env.QUOTE_TO_EMAIL || "skildauto@gmail.com";
        const FROM = process.env.QUOTE_FROM_EMAIL || "Skild Auto <onboarding@resend.dev>";

        if (RESEND_API_KEY) {
          const niceWhen = startTime
            ? new Date(startTime).toLocaleString("en-US", {
                timeZone: "America/Denver",
                dateStyle: "full",
                timeStyle: "short",
              })
            : "—";
          const subject =
            event === "invitee.canceled"
              ? `Calendly canceled — ${inviteeName || inviteeEmail || "Customer"}`
              : `Calendly booked — ${inviteeName || inviteeEmail || "Customer"} · ${niceWhen}`;

          const html = `
            <div style="background:#0a0608;padding:24px;font-family:Arial,sans-serif;color:#fff">
              <div style="max-width:640px;margin:0 auto;background:#141014;border:1px solid #2a1f24;border-radius:12px;padding:28px">
                <h1 style="margin:0 0 4px;font-size:22px">${esc(subject)}</h1>
                <p style="margin:0;color:#9b8e94;font-size:12px;letter-spacing:.14em;text-transform:uppercase">
                  Skild Auto · ${esc(new Date().toLocaleString())}
                </p>
                <table style="margin-top:16px;font-size:14px;color:#fff;border-collapse:collapse">
                  <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Customer</td><td>${esc(inviteeName)} &lt;${esc(inviteeEmail)}&gt;</td></tr>
                  <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">When</td><td>${esc(niceWhen)}</td></tr>
                  <tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Status</td><td>${esc(status)}</td></tr>
                  ${eventUri ? `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Event</td><td><a style="color:#fff" href="${esc(eventUri)}">${esc(eventUri)}</a></td></tr>` : ""}
                  ${quoteId ? `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Quote</td><td>${esc(quoteId)}</td></tr>` : `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">Quote</td><td><em>not matched to a quote</em></td></tr>`}
                </table>
              </div>
            </div>`;

          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: FROM,
                to: [TO],
                reply_to: inviteeEmail || undefined,
                subject,
                html,
                text: `${subject}\n${inviteeEmail || ""}\nWhen: ${niceWhen}\nEvent: ${eventUri || ""}`,
              }),
            });
          } catch (err) {
            console.error("[calendly-webhook] email send failed", err);
          }
        }

        return Response.json({ ok: true, quoteId }, { headers: CORS });
      },
    },
  },
});
