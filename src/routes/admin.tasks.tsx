import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";
import { skildSupabase } from "@/lib/skild-supabase";

export const Route = createFileRoute("/admin/tasks")({
  component: Tasks,
});

type Task = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  status: string;
};

function Tasks() {
  const [items, setItems] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [due, setDue] = useState("");

  async function load() {
    const { data } = await skildSupabase
      .from("admin_tasks")
      .select("id, title, details, due_at, status")
      .order("status", { ascending: true })
      .order("due_at", { ascending: true, nullsFirst: false });
    setItems((data ?? []) as Task[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await skildSupabase.from("admin_tasks").insert({
      title: title.trim(),
      details: details.trim() || null,
      due_at: due ? new Date(due).toISOString() : null,
    });
    setTitle(""); setDetails(""); setDue("");
    load();
  }

  async function toggle(t: Task) {
    await skildSupabase.from("admin_tasks").update({
      status: t.status === "done" ? "open" : "done",
    }).eq("id", t.id);
    load();
  }
  async function remove(id: string) {
    await skildSupabase.from("admin_tasks").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Tasks</h1>

      <form onSubmit={add} className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_220px_auto]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required
          className="rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-brand-red focus:outline-none" />
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none" />
        <button className="rounded-md bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-brand-red-glow">Add</button>
        <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)"
          className="rounded-md border border-border bg-background px-4 py-2 text-sm focus:border-brand-red focus:outline-none sm:col-span-3" />
      </form>

      <ul className="mt-6 space-y-2">
        {items.map((t) => (
          <li key={t.id} className={`flex items-start gap-3 rounded-xl border bg-card p-4 ${t.status === "done" ? "border-border opacity-60" : "border-border"}`}>
            <button onClick={() => toggle(t)}
              className={`mt-1 grid h-5 w-5 place-items-center rounded-md border ${t.status === "done" ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-border hover:border-brand-red"}`}>
              {t.status === "done" && <Check className="h-3 w-3" />}
            </button>
            <div className="flex-1">
              <div className={`font-display tracking-wider ${t.status === "done" ? "line-through" : ""}`}>{t.title}</div>
              {t.details && <div className="text-xs text-muted-foreground">{t.details}</div>}
              {t.due_at && <div className="text-[11px] text-muted-foreground">Due {new Date(t.due_at).toLocaleString()}</div>}
            </div>
            <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-brand-red" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
      </ul>
    </div>
  );
}
