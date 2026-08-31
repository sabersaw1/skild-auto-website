import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { skildSupabase } from "@/lib/skild-supabase";
import { uploadQuotePhoto, PROJECT_FOLDER } from "@/lib/cloudinary-upload";

export const Route = createFileRoute("/admin/gallery")({ component: AdminGallery });

type Photo = {
  id: string;
  image_type: "before" | "after" | "additional";
  sort_order: number;
  caption: string | null;
  alt_text: string | null;
  url: string;
};
type Project = {
  id: string;
  slug: string;
  title: string;
  vehicle_kind: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  service_category: string | null;
  problem: string | null;
  work_performed: string | null;
  result: string | null;
  parts_used: string | null;
  notes: string | null;
  description: string | null;
  project_date: string | null;
  is_published: boolean;
  project_photos: Photo[];
};

const SELECT = `id, slug, title, vehicle_kind, vehicle_year, vehicle_make, vehicle_model,
  service_category, problem, work_performed, result, parts_used, notes, description,
  project_date, is_published, project_photos(id, image_type, sort_order, caption, alt_text, url)`;

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
}

function AdminGallery() {
  const [items, setItems] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(keepId?: string) {
    const { data } = await skildSupabase
      .from("projects")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(200);
    const list = (data ?? []) as unknown as Project[];
    setItems(list);
    if (keepId) setActive(list.find((p) => p.id === keepId) ?? null);
  }
  useEffect(() => { load(); }, []);

  async function createProject() {
    const title = window.prompt("Project title (e.g. Front brake replacement)");
    if (!title) return;
    setBusy(true);
    const { data, error } = await skildSupabase
      .from("projects")
      .insert({ title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}` })
      .select("id")
      .single();
    setBusy(false);
    if (error) return setMsg(error.message);
    await load(data!.id as string);
  }

  async function save(patch: Partial<Project>) {
    if (!active) return;
    setBusy(true);
    const { error } = await skildSupabase
      .from("projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", active.id);
    setBusy(false);
    setMsg(error ? error.message : "Saved");
    await load(active.id);
  }

  async function removeProject() {
    if (!active || !window.confirm("Delete this project?")) return;
    await skildSupabase.from("projects").delete().eq("id", active.id);
    setActive(null);
    await load();
  }

  async function addPhotos(files: FileList | null, type: Photo["image_type"]) {
    if (!files?.length || !active) return;
    setBusy(true);
    try {
      let order = active.project_photos.filter((p) => p.image_type === type).length;
      for (const file of Array.from(files)) {
        const up = await uploadQuotePhoto(file, PROJECT_FOLDER);
        await skildSupabase.from("project_photos").insert({
          project_id: active.id,
          image_type: type,
          sort_order: order++,
          url: up.secureUrl,
          storage_ref: up.publicId,
          provider: "cloudinary",
          width: up.width ?? null,
          height: up.height ?? null,
          alt_text: `${active.title} ${type} photo`,
        });
      }
      await load(active.id);
      setMsg("Photos uploaded");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function deletePhoto(id: string) {
    await skildSupabase.from("project_photos").delete().eq("id", id);
    await load(active?.id);
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">{items.length} project(s)</p>
        </div>
        <button onClick={createProject} disabled={busy}
          className="rounded-md bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">
          New project
        </button>
      </header>
      {msg && <p className="mt-3 text-sm text-brand-red">{msg}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <button onClick={() => setActive(p)}
                className={`w-full rounded-xl border bg-card p-4 text-left transition hover:border-brand-red/60 ${active?.id === p.id ? "border-brand-red" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display tracking-wider">{p.title}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${p.is_published ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-400" : "border-border bg-muted text-muted-foreground"}`}>
                    {p.is_published ? "live" : "draft"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">/gallery/{p.slug}</div>
              </button>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No projects yet.</p>}
        </ul>

        {active && (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl">{active.title}</h2>
              <div className="flex gap-2">
                <button onClick={() => save({ is_published: !active.is_published })} disabled={busy}
                  className="rounded-md border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest hover:border-brand-red hover:text-brand-red">
                  {active.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={removeProject}
                  className="rounded-md border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest hover:border-brand-red hover:text-brand-red">
                  Delete
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Title" value={active.title} onChange={(v) => setActive({ ...active, title: v })} />
              <Field label="Slug" value={active.slug} onChange={(v) => setActive({ ...active, slug: v })} />
              <SelectField label="Vehicle type" value={active.vehicle_kind} options={["auto", "moto"]}
                onChange={(v) => setActive({ ...active, vehicle_kind: v })} />
              <Field label="Year" value={active.vehicle_year?.toString() ?? ""} onChange={(v) => setActive({ ...active, vehicle_year: v ? Number(v) : null })} />
              <Field label="Make" value={active.vehicle_make ?? ""} onChange={(v) => setActive({ ...active, vehicle_make: v })} />
              <Field label="Model" value={active.vehicle_model ?? ""} onChange={(v) => setActive({ ...active, vehicle_model: v })} />
              <Field label="Service / category" value={active.service_category ?? ""} onChange={(v) => setActive({ ...active, service_category: v })} />
              <Field label="Project date" type="date" value={active.project_date ?? ""} onChange={(v) => setActive({ ...active, project_date: v || null })} />
            </div>
            <div className="mt-3 grid gap-3">
              <Area label="Short description" value={active.description ?? ""} onChange={(v) => setActive({ ...active, description: v })} />
              <Area label="Problem / diagnosis" value={active.problem ?? ""} onChange={(v) => setActive({ ...active, problem: v })} />
              <Area label="Work performed" value={active.work_performed ?? ""} onChange={(v) => setActive({ ...active, work_performed: v })} />
              <Area label="Result" value={active.result ?? ""} onChange={(v) => setActive({ ...active, result: v })} />
              <Area label="Parts used" value={active.parts_used ?? ""} onChange={(v) => setActive({ ...active, parts_used: v })} />
              <Area label="Internal notes (never public)" value={active.notes ?? ""} onChange={(v) => setActive({ ...active, notes: v })} />
            </div>
            <button
              onClick={() => save({
                title: active.title, slug: active.slug, vehicle_kind: active.vehicle_kind,
                vehicle_year: active.vehicle_year, vehicle_make: active.vehicle_make,
                vehicle_model: active.vehicle_model, service_category: active.service_category,
                problem: active.problem, work_performed: active.work_performed, result: active.result,
                parts_used: active.parts_used, notes: active.notes, description: active.description,
                project_date: active.project_date,
              })}
              disabled={busy}
              className="mt-5 rounded-md bg-brand-red px-5 py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save changes"}
            </button>

            {(["before", "after", "additional"] as const).map((type) => (
              <div key={type} className="mt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-red">{type} photos</h3>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-bold uppercase tracking-widest hover:border-brand-red hover:text-brand-red">
                    <Upload className="h-3 w-3" /> Add
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { addPhotos(e.target.files, type); e.target.value = ""; }} />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {active.project_photos.filter((p) => p.image_type === type)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((p) => (
                      <div key={p.id} className="relative">
                        <img src={p.url} alt={p.alt_text ?? ""} className="h-24 w-24 rounded-md border border-border object-cover" />
                        <button onClick={() => deletePhoto(p.id)} aria-label="Delete photo"
                          className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-border bg-background text-brand-red">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none" />
    </label>
  );
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-brand-red focus:outline-none" />
    </label>
  );
}
