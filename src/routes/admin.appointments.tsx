import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { skildSupabase } from "@/lib/skild-supabase";
import { setAppointmentStatus } from "@/lib/appointments.functions";
import { getAdminAccessToken } from "@/lib/skild-admin-token";

export const Route = createFileRoute("/admin/appointments")({
  component: Appointments,
});

// Build the canonical Google Calendar event URL. Format documented by Google:
// base64(`${eventId} ${calendarId}`) — url-safe, padding stripped.
// This URL works on mobile (opens the Google Calendar app when installed)
// and desktop, and never relies on a popup.
function googleEventUrl(eventId: string, calendarId: string | null): string {
  if (!calendarId) {
    // Fallback: open the user's primary calendar; better than a broken link.
    return "https://calendar.google.com/calendar/r";
  }
  const raw = `${eventId} ${calendarId}`;
  const b64 =
    typeof btoa === "function"
      ? btoa(raw)
      : Buffer.from(raw, "utf-8").toString("base64");
  const eid = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `https://calendar.google.com/calendar/event?eid=${eid}`;
}

type Appt = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  google_event_id: string | null;
  customer: { full_name: string | null; email: string | null; phone: string | null; location: string | null } | null;
  vehicle: { year: number | null; make: string | null; model: string | null } | null;
  quote: { requested_service: string | null; description: string | null } | null;
};

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

function Appointments() {
  const [items, setItems] = useState<Appt[]>([]);
  const [filter, setFilter] = useState<string>("upcoming");
  const [calendarId, setCalendarId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/skild-config")
      .then((r) => r.json())
      .then((cfg: { googleCalendarId?: string }) => {
        if (!cancelled) setCalendarId(cfg.googleCalendarId || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function load() {
    let q = skildSupabase
      .from("appointments")
      .select(`id, start_at, end_at, status, notes, google_event_id,
        customer:customer_id(full_name,email,phone,location),
        vehicle:vehicle_id(year,make,model),
        quote:quote_id(requested_service,description)`)
      .order("start_at", { ascending: true })
      .limit(200);
    if (filter === "upcoming") q = q.gte("start_at", new Date().toISOString()).neq("status", "cancelled");
    else if (filter === "today") {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const n = new Date(t); n.setDate(n.getDate() + 1);
      q = q.gte("start_at", t.toISOString()).lt("start_at", n.toISOString());
    } else if (filter !== "all") {
      q = q.eq("status", filter);
    }
    const { data } = await q;
    setItems((data ?? []) as unknown as Appt[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function setStatus(id: string, status: string) {
    const accessToken = await getAdminAccessToken();
    await setAppointmentStatus({
      data: { appointmentId: id, accessToken, status: status as "pending" | "confirmed" | "completed" | "cancelled" | "no_show" },
    });
    load();
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} loaded</p>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="upcoming">Upcoming</option>
          <option value="today">Today</option>
          <option value="all">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>

      <ul className="mt-6 space-y-3">
        {items.map((a) => {
          const when = new Date(a.start_at).toLocaleString("en-US", {
            timeZone: "America/Denver",
            weekday: "short", month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit",
          });
          const vehicle = [a.vehicle?.year, a.vehicle?.make, a.vehicle?.model].filter(Boolean).join(" ");
          return (
            <li key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display tracking-wider">{when}</div>
                  <div className="mt-1 text-sm">{a.customer?.full_name || "—"} · {a.quote?.requested_service || "—"}</div>
                  <div className="text-xs text-muted-foreground">{vehicle || "—"} · {a.customer?.location || "—"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{a.customer?.phone} · {a.customer?.email}</div>
                </div>
                <select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {a.quote?.description && (
                <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{a.quote.description}</p>
              )}
              {a.google_event_id && (
                <a
                  href={googleEventUrl(a.google_event_id, calendarId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-brand-red hover:text-brand-red-glow"
                >
                  <ExternalLink className="h-3 w-3" /> View in Google Calendar
                </a>
              )}
            </li>
          );
        })}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No appointments.</p>}
      </ul>
    </div>
  );
}
