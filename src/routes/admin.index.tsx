import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ClipboardList, ListChecks, ArrowRight } from "lucide-react";
import { skildSupabase } from "@/lib/skild-supabase";
import { bootstrapSkildAdmin } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

type Stats = {
  todayAppts: number;
  pendingQuotes: number;
  upcomingAppts: number;
  openTasks: number;
};

function Overview() {
  const [s, setS] = useState<Stats | null>(null);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    Promise.all([
      skildSupabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("start_at", today.toISOString())
        .lt("start_at", tomorrow.toISOString())
        .neq("status", "cancelled"),
      skildSupabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "new"),
      skildSupabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("start_at", today.toISOString())
        .lt("start_at", in7.toISOString())
        .neq("status", "cancelled"),
      skildSupabase
        .from("admin_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
    ]).then(([a, q, u, t]) => {
      setS({
        todayAppts: a.count ?? 0,
        pendingQuotes: q.count ?? 0,
        upcomingAppts: u.count ?? 0,
        openTasks: t.count ?? 0,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl">Today at Skild Auto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Today's appts"
          value={s?.todayAppts}
          icon={<Calendar className="h-4 w-4" />}
          to="/admin/appointments"
        />
        <Stat
          label="Pending quotes"
          value={s?.pendingQuotes}
          icon={<ClipboardList className="h-4 w-4" />}
          to="/admin/quotes"
        />
        <Stat
          label="Upcoming (7d)"
          value={s?.upcomingAppts}
          icon={<Calendar className="h-4 w-4" />}
          to="/admin/appointments"
        />
        <Stat
          label="Open tasks"
          value={s?.openTasks}
          icon={<ListChecks className="h-4 w-4" />}
          to="/admin/tasks"
        />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <QuickLink to="/admin/quotes" label="Review new quotes" />
        <QuickLink to="/admin/appointments" label="Open appointment calendar" />
        <QuickLink to="/admin/tasks" label="Manage today's tasks" />
        <QuickLink to="/admin/settings" label="Edit hours & blocked time" />
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground">
        First-time setup?{" "}
        <button
          onClick={async () => {
            const r = await bootstrapSkildAdmin();
            setBootstrapMsg(r.ok ? `Admin provisioned (${r.email})` : `Failed: ${r.error}`);
          }}
          className="font-bold uppercase tracking-widest text-brand-red hover:underline"
        >
          Run admin bootstrap
        </button>
        {bootstrapMsg && <span className="ml-3">{bootstrapMsg}</span>}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  to,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-card p-5 hover:border-brand-red/60"
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
        <span className="text-brand-red">{icon}</span>
      </div>
      <div className="mt-3 font-display text-4xl">{value ?? "—"}</div>
    </Link>
  );
}
function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-brand-red/60"
    >
      <span className="text-sm font-bold uppercase tracking-widest">{label}</span>
      <ArrowRight className="h-4 w-4 text-brand-red" />
    </Link>
  );
}
