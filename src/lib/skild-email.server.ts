// Server-only Resend helpers for booking confirmations.

import { getSkildAdmin } from "./skild-supabase.server";

function esc(s: unknown) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

function shell(title: string, inner: string) {
  return `<div style="background:#0a0608;padding:24px;font-family:Arial,sans-serif;color:#fff">
    <div style="max-width:640px;margin:0 auto;background:#141014;border:1px solid #2a1f24;border-radius:12px;padding:28px">
      <p style="margin:0;color:#dc1e28;font-size:11px;letter-spacing:.3em;text-transform:uppercase">Skild Auto</p>
      <h1 style="margin:6px 0 16px;font-size:22px">${esc(title)}</h1>
      ${inner}
      <p style="margin-top:24px;color:#9b8e94;font-size:11px">Skild Auto · Salt Lake City, UT · skildauto@gmail.com · 801-584-9804</p>
    </div>
  </div>`;
}

/** Sends through Resend. Returns true only when Resend accepted the email (callers retry on false). */
async function resendSend(payload: Record<string, unknown>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[email] resend failed", res.status, t);
    return false;
  }
  return true;
}

export type BookingEmailResult = { admin: boolean; customer: boolean | null };

/** Admin notice + customer confirmation (with an "add to calendar" file). */
export async function sendBookingEmails(
  appointmentId: string,
  which: { admin: boolean; customer: boolean } = { admin: true, customer: true },
): Promise<BookingEmailResult> {
  const sb = getSkildAdmin();
  const { data: appt, error } = await sb
    .from("appointments")
    .select(`
      id, start_at, end_at, status, notes,
      customer:customer_id ( id, full_name, email, phone, location ),
      vehicle:vehicle_id ( kind, year, make, model, mileage ),
      quote:quote_id ( id, requested_service, description, notes, summary )
    `)
    .eq("id", appointmentId)
    .single();
  if (error || !appt) throw error ?? new Error("Appointment not found");

  const c = (appt.customer ?? {}) as { full_name?: string; email?: string; phone?: string; location?: string };
  const v = (appt.vehicle ?? {}) as { kind?: string; year?: number; make?: string; model?: string; mileage?: string };
  const q = (appt.quote ?? {}) as { id?: string; requested_service?: string; description?: string; notes?: string };

  const { data: photos } = q.id
    ? await sb.from("quote_photos").select("url, original_filename").eq("quote_id", q.id)
    : { data: [] as { url: string; original_filename: string | null }[] };

  const when = fmtDateTime(appt.start_at);
  const vehicleLine = [v.year, v.make, v.model].filter(Boolean).join(" ") || "—";
  const photoList = (photos ?? []).length
    ? `<ul style="margin:6px 0 0;padding-left:18px;font-size:13px">${(photos ?? [])
        .map((p) => `<li><a href="${esc(p.url)}" style="color:#dc1e28">${esc(p.original_filename || "photo")}</a></li>`)
        .join("")}</ul>`
    : `<p style="margin:0;font-size:13px;color:#9b8e94">No photos uploaded.</p>`;

  const detailsTable = (rows: [string, string][]) =>
    `<table style="font-size:14px;border-collapse:collapse">${rows
      .map(([k, val]) => `<tr><td style="padding:2px 12px 2px 0;color:#9b8e94">${esc(k)}</td><td>${esc(val)}</td></tr>`)
      .join("")}</table>`;

  // ---- Admin email ----
  const adminInner = `
    <h3 style="margin:16px 0 6px;color:#dc1e28;font-size:13px;letter-spacing:.18em;text-transform:uppercase">Appointment</h3>
    ${detailsTable([["When", when], ["Status", appt.status], ["Service", q.requested_service || "—"]])}

    <h3 style="margin:20px 0 6px;color:#dc1e28;font-size:13px;letter-spacing:.18em;text-transform:uppercase">Customer</h3>
    ${detailsTable([
      ["Name", c.full_name || "—"],
      ["Phone", c.phone || "—"],
      ["Email", c.email || "—"],
      ["Location", c.location || "—"],
    ])}

    <h3 style="margin:20px 0 6px;color:#dc1e28;font-size:13px;letter-spacing:.18em;text-transform:uppercase">Vehicle</h3>
    ${detailsTable([
      ["Type", v.kind === "moto" ? "Motorcycle" : "Automotive"],
      ["Vehicle", vehicleLine],
      ["Mileage", v.mileage || "—"],
    ])}

    <h3 style="margin:20px 0 6px;color:#dc1e28;font-size:13px;letter-spacing:.18em;text-transform:uppercase">Description</h3>
    <p style="margin:0;white-space:pre-wrap;font-size:14px">${esc(q.description || "—")}</p>
    ${q.notes ? `<p style="margin:8px 0 0;font-size:13px;color:#9b8e94"><strong>Notes:</strong> ${esc(q.notes)}</p>` : ""}

    <h3 style="margin:20px 0 6px;color:#dc1e28;font-size:13px;letter-spacing:.18em;text-transform:uppercase">Photos</h3>
    ${photoList}
  `;
  const admin = !which.admin ? true : await resendSend({
    from: process.env.QUOTE_FROM_EMAIL || "Skild Auto <onboarding@resend.dev>",
    to: [process.env.QUOTE_TO_EMAIL || "skildauto@gmail.com"],
    reply_to: c.email || undefined,
    subject: `New booking — ${c.full_name || "Customer"} · ${vehicleLine} · ${when}`,
    html: shell(`New booking · ${when}`, adminInner),
  });

  // ---- Customer confirmation ----
  let customer: boolean | null = null;
  if (c.email && which.customer) {
    const { buildIcs } = await import("./ics");
    const ics = buildIcs({
      uid: appt.id,
      startISO: appt.start_at,
      endISO: appt.end_at,
      summary: `Skild Auto: ${q.requested_service || "service"} (${vehicleLine})`,
      description: "Your Skild Auto technician comes to you. Questions or changes: call 801-584-9804 or reply to the email.",
      location: c.location || undefined,
    });
    const custInner = `
      <p style="font-size:14px">Hi ${esc(c.full_name?.split(" ")[0] || "there")},</p>
      <p style="font-size:14px">Thanks for booking with Skild Auto. We've received your request and will confirm shortly.</p>
      ${detailsTable([
        ["When", when],
        ["Service", q.requested_service || "—"],
        ["Vehicle", vehicleLine],
        ["Where", c.location || "—"],
      ])}
      <p style="margin-top:16px;font-size:13px;color:#9b8e94">All times are Mountain Time (Salt Lake City). The attached file adds the appointment to your calendar.</p>
      <p style="margin-top:8px;font-size:13px;color:#9b8e94">Need to change anything? Reply to this email or call 801-584-9804.</p>
    `;
    customer = await resendSend({
      from: process.env.QUOTE_FROM_EMAIL || "Skild Auto <onboarding@resend.dev>",
      to: [c.email],
      subject: `Your Skild Auto booking · ${when}`,
      html: shell("Booking received", custInner),
      attachments: [{ filename: "skild-auto-booking.ics", content: Buffer.from(ics).toString("base64"), content_type: "text/calendar" }],
    });
  }
  return { admin, customer };
}
