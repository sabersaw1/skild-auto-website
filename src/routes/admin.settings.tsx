import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Trash2, Calendar as CalendarIcon, CheckCircle2, XCircle } from "lucide-react";
import { skildSupabase } from "@/lib/skild-supabase";
import {
  getGoogleCalendarStatus,
  getGoogleCalendarAuthUrl,
  disconnectGoogleCalendar,
} from "@/lib/google-calendar.functions";

export const Route = createFileRoute("/admin/settings")({
  component: ScheduleSettings,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Hours = { id: string; weekday: number; open_time: string; close_time: string; is_open: boolean };
type Block = { id: string; start_at: string; end_at: string; reason: string | null };

function ScheduleSettings() {
  const [hours, setHours] = useState<Hours[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bStart, setBStart] = useState("");
  const [bEnd, setBEnd] = useState("");
  const [bReason, setBReason] = useState("");

  async function load() {
    const [h, b] = await Promise.all([
      skildSupabase.from("business_hours").select("*").order("weekday"),
      skildSupabase.from("blocked_times").select("*").order("start_at"),
    ]);
    setHours((h.data ?? []) as Hours[]);
    setBlocks((b.data ?? []) as Block[]);
  }
  useEffect(() => { load(); }, []);

  async function saveHours(row: Hours, patch: Partial<Hours>) {
    await skildSupabase.from("business_hours").update(patch).eq("id", row.id);
    load();
  }

  async function addBlock(e: FormEvent) {
    e.preventDefault();
    if (!bStart || !bEnd) return;
    await skildSupabase.from("blocked_times").insert({
      start_at: new Date(bStart).toISOString(),
      end_at: new Date(bEnd).toISOString(),
      reason: bReason.trim() || null,
    });
    setBStart(""); setBEnd(""); setBReason("");
    load();
  }
  async function delBlock(id: string) {
    await skildSupabase.from("blocked_times").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Schedule settings</h1>

      <GoogleCalendarPanel />



      <section className="mt-8">
        <h2 className="font-display text-lg">Business hours</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          {hours.map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <span className="w-12 font-display tracking-wider">{DAYS[h.weekday]}</span>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={h.is_open}
                  onChange={(e) => saveHours(h, { is_open: e.target.checked })} />
                Open
              </label>
              <input type="time" value={h.open_time.slice(0, 5)}
                onChange={(e) => saveHours(h, { open_time: `${e.target.value}:00` })}
                disabled={!h.is_open}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-40" />
              <span className="text-muted-foreground">→</span>
              <input type="time" value={h.close_time.slice(0, 5)}
                onChange={(e) => saveHours(h, { close_time: `${e.target.value}:00` })}
                disabled={!h.is_open}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm disabled:opacity-40" />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg">Blocked time</h2>
        <form onSubmit={addBlock} className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-xs">
            <span className="block text-muted-foreground">Start</span>
            <input type="datetime-local" value={bStart} onChange={(e) => setBStart(e.target.value)} required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="block text-muted-foreground">End</span>
            <input type="datetime-local" value={bEnd} onChange={(e) => setBEnd(e.target.value)} required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <span className="block text-muted-foreground">Reason</span>
            <input value={bReason} onChange={(e) => setBReason(e.target.value)} placeholder="optional"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <button className="self-end rounded-md bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand-red-glow">Add block</button>
        </form>

        <ul className="mt-4 space-y-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
              <span>
                {new Date(b.start_at).toLocaleString()} → {new Date(b.end_at).toLocaleString()}
                {b.reason && <span className="ml-2 text-muted-foreground">· {b.reason}</span>}
              </span>
              <button onClick={() => delBlock(b.id)} className="text-muted-foreground hover:text-brand-red"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {blocks.length === 0 && <p className="text-sm text-muted-foreground">No blocked time.</p>}
        </ul>
      </section>
    </div>
  );
}

type GStatus =
  | { connected: false }
  | { connected: true; calendarId: string | null; connectedAt: string | null; scope: string | null };

function GoogleCalendarPanel() {
  const [status, setStatus] = useState<GStatus | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const s = (await getGoogleCalendarStatus()) as GStatus;
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    }
  }
  useEffect(() => { refresh(); }, []);

  async function connect() {
    setBusy(true);
    try {
      const { url } = await getGoogleCalendarAuthUrl();
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    if (!confirm("Disconnect Google Calendar? Existing events stay in Google but new bookings won't sync.")) return;
    setBusy(true);
    try {
      await disconnectGoogleCalendar();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connected === true;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-brand-red" />
        Google Calendar
      </h2>
      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        {status === null ? (
          <p className="text-sm text-muted-foreground">Checking connection…</p>
        ) : connected ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Connected</span>
              </div>
              <p className="mt-2 text-sm">
                Calendar: <span className="text-muted-foreground">{status.calendarId || "primary"}</span>
              </p>
              {status.connectedAt && (
                <p className="text-xs text-muted-foreground">
                  Linked {new Date(status.connectedAt).toLocaleString()}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                New appointments sync to Google. Busy times block customer slots.
              </p>
            </div>
            <button
              onClick={disconnect}
              disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:border-brand-red hover:text-brand-red disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Not connected</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect your Google Calendar to auto-create events for every booking and block customer slots
                during busy times.
              </p>
            </div>
            <button
              onClick={connect}
              disabled={busy}
              className="rounded-md bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand-red-glow disabled:opacity-50"
            >
              {busy ? "Opening…" : "Connect Google Calendar"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
