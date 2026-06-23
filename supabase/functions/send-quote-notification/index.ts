// Skild Auto — quote notification email.
//
// Deployed to YOUR Supabase project (not Lovable Cloud), keeping the
// stack portable across GitHub, Vercel, Neon, and future Skild OS.
//
// Deploy:
//   supabase functions deploy send-quote-notification --project-ref xukkcixylfasoerjnkra
//
// Required env (set in Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY     — from https://resend.com/api-keys
//   QUOTE_TO_EMAIL     — skildautoi@gmail.com
//   QUOTE_FROM_EMAIL   — verified Resend sender, e.g. quotes@skildauto.com
//                        (use onboarding@resend.dev for testing)
//
// Bucket `quote-photos` must be public so the links in the email work
// without signed URLs. (If you later switch to a private bucket, replace
// the photo URLs with signed URLs generated here.)

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — runs in Deno on Supabase Edge, not in the Vite build.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const TO = Deno.env.get("QUOTE_TO_EMAIL") ?? "skildauto@gmail.com";
  const FROM = Deno.env.get("QUOTE_FROM_EMAIL") ?? "Skild Auto <onboarding@resend.dev>";

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...CORS, "content-type": "application/json" } },
    );
  }

  let p: any;
  try { p = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...CORS, "content-type": "application/json" } });
  }

  const c = p?.customer ?? {};
  const v = p?.vehicle ?? {};
  const s = p?.service ?? {};
  const photos: string[] = Array.isArray(p?.photos) ? p.photos : [];

  const subject = `New Skild Auto quote — ${c.fullName || "Customer"} · ${s.requested || "Service"}`;

  const photoHtml = photos.length
    ? `<h3 style="margin:24px 0 8px;font-family:Arial,sans-serif;font-size:14px;color:#dc1e28;text-transform:uppercase;letter-spacing:.18em">Photos</h3>
       <div>${photos.map((u) => `
         <a href="${esc(u)}" target="_blank" rel="noopener" style="display:inline-block;margin:0 8px 8px 0">
           <img src="${esc(u)}" alt="Customer photo" width="160" style="display:block;border:1px solid #222;border-radius:6px"/>
         </a>`).join("")}</div>
       <p style="font-family:Arial,sans-serif;font-size:12px;color:#666">
         ${photos.map((u, i) => `<a href="${esc(u)}">Photo ${i + 1}</a>`).join(" · ")}
       </p>`
    : `<p style="font-family:Arial,sans-serif;font-size:13px;color:#666">No photos uploaded.</p>`;

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

      ${photoHtml}
    </div>
  </div>`;

  const text = (p.summary || "") + (photos.length ? `\n\nPhotos:\n${photos.join("\n")}` : "");

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
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return new Response(JSON.stringify({ error: "Resend send failed", detail: err }),
      { status: 502, headers: { ...CORS, "content-type": "application/json" } });
  }

  const data = await resendRes.json();
  return new Response(JSON.stringify({ ok: true, id: data?.id }),
    { status: 200, headers: { ...CORS, "content-type": "application/json" } });
});
