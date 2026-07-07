import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { skildSupabase } from "@/lib/skild-supabase";

export const Route = createFileRoute("/admin/customers")({
  component: Customers,
});

type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  created_at: string;
};

type CustomerDetails = {
  vehicles: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
    kind: string;
  }[];
  quotes: { id: string; created_at: string; requested_service: string | null; status: string }[];
  appointments: { id: string; start_at: string; status: string }[];
};

function Customers() {
  const [list, setList] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Customer | null>(null);
  const [details, setDetails] = useState<CustomerDetails | null>(null);

  useEffect(() => {
    let qb = skildSupabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (q.trim()) qb = qb.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    qb.then(({ data }) => setList((data ?? []) as Customer[]));
  }, [q]);

  useEffect(() => {
    if (!active) {
      setDetails(null);
      return;
    }
    Promise.all([
      skildSupabase.from("vehicles").select("*").eq("customer_id", active.id),
      skildSupabase
        .from("quotes")
        .select("id, created_at, requested_service, status")
        .eq("customer_id", active.id)
        .order("created_at", { ascending: false }),
      skildSupabase
        .from("appointments")
        .select("id, start_at, status")
        .eq("customer_id", active.id)
        .order("start_at", { ascending: false }),
    ]).then(([v, qq, ap]) => {
      setDetails({
        vehicles: (v.data ?? []) as never,
        quotes: (qq.data ?? []) as never,
        appointments: (ap.data ?? []) as never,
      });
    });
  }, [active]);

  return (
    <div>
      <h1 className="font-display text-3xl">Customers</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone"
        className="mt-4 w-full max-w-md rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-brand-red focus:outline-none"
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_420px]">
        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActive(c)}
                className={`w-full rounded-xl border bg-card p-4 text-left hover:border-brand-red/60 ${active?.id === c.id ? "border-brand-red" : "border-border"}`}
              >
                <div className="font-display tracking-wider">{c.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {c.email || c.phone || "—"} · {c.location || "—"}
                </div>
              </button>
            </li>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">No customers.</p>}
        </ul>

        {active && (
          <aside className="sticky top-6 h-fit space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-lg">{active.full_name}</h2>
            <div className="text-xs text-muted-foreground">
              {active.email} · {active.phone}
            </div>

            <Section title="Vehicles">
              {details?.vehicles.length ? (
                details.vehicles.map((v) => (
                  <li key={v.id} className="text-sm">
                    {[v.year, v.make, v.model].filter(Boolean).join(" ")}{" "}
                    <span className="text-xs text-muted-foreground">· {v.kind}</span>
                  </li>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </Section>

            <Section title="Quotes">
              {details?.quotes.length ? (
                details.quotes.map((q) => (
                  <li key={q.id} className="text-sm">
                    {q.requested_service || "—"}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {q.status} · {new Date(q.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </Section>

            <Section title="Appointments">
              {details?.appointments.length ? (
                details.appointments.map((a) => (
                  <li key={a.id} className="text-sm">
                    {new Date(a.start_at).toLocaleString()}{" "}
                    <span className="text-xs text-muted-foreground">· {a.status}</span>
                  </li>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </Section>
          </aside>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-red">{title}</h3>
      <ul className="mt-2 space-y-1">{children}</ul>
    </div>
  );
}
