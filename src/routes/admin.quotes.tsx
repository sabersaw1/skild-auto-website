import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { skildSupabase } from "@/lib/skild-supabase";

export const Route = createFileRoute("/admin/quotes")({
  component: Quotes,
});

type Quote = {
  id: string;
  created_at: string;
  status: string;
  requested_service: string | null;
  description: string | null;
  notes: string | null;
  summary: string | null;
  customer: { full_name: string | null; email: string | null; phone: string | null; location: string | null } | null;
  vehicle: { kind: string | null; year: number | null; make: string | null; model: string | null; mileage: string | null } | null;
  quote_photos: { id: string; url: string; original_filename: string | null }[];
};

const STATUSES = ["new", "contacted", "scheduled", "completed", "archived"] as const;

function Quotes() {
  const [items, setItems] = useState<Quote[]>([]);
  const [active, setActive] = useState<Quote | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function load() {
    let q = skildSupabase
      .from("quotes")
      .select(`id, created_at, status, requested_service, description, notes, summary,
        customer:customer_id(full_name,email,phone,location),
        vehicle:vehicle_id(kind,year,make,model,mileage),
        quote_photos(id, url, original_filename)`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setItems((data ?? []) as unknown as Quote[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter]);

  async function updateStatus(id: string, status: string) {
    await skildSupabase.from("quotes").update({ status }).eq("id", id);
    load();
    if (active?.id === id) setActive({ ...active, status });
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Quotes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} loaded</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <option value="all">All</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_400px]">
        <ul className="space-y-2">
          {items.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => setActive(q)}
                className={`w-full rounded-xl border bg-card p-4 text-left transition hover:border-brand-red/60 ${
                  active?.id === q.id ? "border-brand-red" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display tracking-wider">{q.customer?.full_name || "—"}</span>
                  <StatusPill status={q.status} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {q.requested_service || "—"} · {[q.vehicle?.year, q.vehicle?.make, q.vehicle?.model].filter(Boolean).join(" ") || "—"}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(q.created_at).toLocaleString()}
                </div>
              </button>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No quotes.</p>}
        </ul>

        {active && (
          <aside className="sticky top-6 h-fit rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">{active.customer?.full_name || "Customer"}</h2>
              <select value={active.status} onChange={(e) => updateStatus(active.id, e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Detail k="Email" v={active.customer?.email} />
              <Detail k="Phone" v={active.customer?.phone} />
              <Detail k="Location" v={active.customer?.location} />
              <Detail k="Vehicle" v={[active.vehicle?.year, active.vehicle?.make, active.vehicle?.model].filter(Boolean).join(" ")} />
              <Detail k="Mileage" v={active.vehicle?.mileage} />
              <Detail k="Service" v={active.requested_service} />
            </dl>
            {active.description && (
              <>
                <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-red">Description</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{active.description}</p>
              </>
            )}
            {active.notes && (
              <>
                <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-red">Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm">{active.notes}</p>
              </>
            )}
            {active.quote_photos?.length > 0 && (
              <>
                <h3 className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-red">Photos</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {active.quote_photos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer">
                      <img src={p.url} alt={p.original_filename || ""} className="h-20 w-20 rounded-md border border-border object-cover" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
      <dd className="text-right">{v || "—"}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-brand-red/15 text-brand-red border-brand-red/40",
    contacted: "bg-amber-500/15 text-amber-400 border-amber-400/40",
    scheduled: "bg-emerald-500/15 text-emerald-400 border-emerald-400/40",
    completed: "bg-sky-500/15 text-sky-400 border-sky-400/40",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${map[status] || map.archived}`}>{status}</span>
  );
}
