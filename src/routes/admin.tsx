import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LayoutDashboard, ClipboardList, Calendar, Users, ListChecks, Settings, LogOut, Images } from "lucide-react";
import { useSkildSession, signInWithPassword, signOut } from "@/lib/skild-auth";
import { bootstrapSkildAdmin } from "@/lib/admin-bootstrap.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Skild Auto" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const sess = useSkildSession();

  if (sess.loading) {
    return <CenterBox><p className="text-sm text-muted-foreground">Loading…</p></CenterBox>;
  }
  if (!sess.user) return <LoginScreen />;
  if (!sess.isAdmin) {
    return (
      <CenterBox>
        <h1 className="font-display text-2xl">Not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your account doesn't have admin access.</p>
        <button onClick={signOut} className="mt-6 rounded-md border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest hover:border-brand-red hover:text-brand-red">Sign out</button>
      </CenterBox>
    );
  }
  return <Shell />;
}

function Shell() {
  const router = useRouter();
  const sess = useSkildSession();
  const displayName =
    (sess.user?.user_metadata as { display_name?: string } | undefined)?.display_name ||
    sess.user?.email?.split("@")[0] ||
    "skild";
  const links = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/quotes", label: "Quotes", icon: ClipboardList },
    { to: "/admin/appointments", label: "Appointments", icon: Calendar },
    { to: "/admin/customers", label: "Customers", icon: Users },
    { to: "/admin/gallery", label: "Gallery", icon: Images },
    { to: "/admin/tasks", label: "Tasks", icon: ListChecks },
    { to: "/admin/settings", label: "Schedule", icon: Settings },
  ] as const;
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <aside className="border-b border-border bg-card lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-red">Skild Auto</p>
            <p className="font-display text-lg">{displayName}</p>
          </div>
          <button
            onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}
            className="grid h-9 w-9 place-items-center rounded-md border border-border hover:border-brand-red hover:text-brand-red"
            aria-label="Sign out"
          ><LogOut className="h-4 w-4" /></button>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/admin" }}
                activeProps={{ className: "border-brand-red bg-brand-red/10 text-brand-red" }}
                className="flex shrink-0 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm hover:border-brand-red/40 hover:bg-background"
              >
                <Icon className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 lg:p-10">
        <Outlet />
      </main>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = useState("skildauto@gmail.com");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootBusy, setBootBusy] = useState(false);
  const [bootMsg, setBootMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await signInWithPassword(email, pw);
    setBusy(false);
    if (error) setErr(error.message);
  }

  async function runBootstrap() {
    setBootBusy(true); setBootMsg(null);
    try {
      const r = await bootstrapSkildAdmin();
      setBootMsg(r.ok
        ? `Admin ready (${r.email}). Sign in with the password from SKILD_ADMIN_PASSWORD.`
        : `Failed: ${r.error}`);
    } catch (e) {
      setBootMsg(e instanceof Error ? e.message : "Bootstrap failed");
    } finally {
      setBootBusy(false);
    }
  }

  return (
    <CenterBox>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-red">Skild Auto</p>
      <h1 className="mt-2 font-display text-3xl">Admin sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required
            className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none" />
        </label>
        {err && <p className="text-sm text-brand-red">{err}</p>}
        <button type="submit" disabled={busy}
          className="w-full rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-6 border-t border-border pt-4 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">First-time setup</p>
        <button
          onClick={runBootstrap}
          disabled={bootBusy}
          className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red disabled:opacity-50"
        >
          {bootBusy ? "Provisioning…" : "Run admin bootstrap"}
        </button>
        {bootMsg && <p className="mt-2 text-[11px] text-muted-foreground">{bootMsg}</p>}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Private portal. Access logged.</p>
    </CenterBox>
  );
}

function CenterBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">{children}</div>
    </div>
  );
}
