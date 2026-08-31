import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { getPublishedProject, type ProjectPhoto } from "@/lib/gallery.functions";
import { abs, NOINDEX } from "@/lib/seo";

export const Route = createFileRoute("/gallery/$slug")({
  loader: async ({ params }) => {
    const { project } = await getPublishedProject({ data: { slug: params.slug } });
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Project unavailable — Skild Auto" }, NOINDEX] };
    }
    const p = loaderData.project;
    const vehicle = [p.vehicle_year, p.vehicle_make, p.vehicle_model].filter(Boolean).join(" ");
    const title = `${p.title}${vehicle ? ` — ${vehicle}` : ""} | Skild Auto`;
    const description =
      (p.description || p.work_performed || p.problem || "Real mobile repair work by Skild Auto in Salt Lake City.").slice(0, 155);
    const cover = (p.project_photos ?? []).find((x) => x.image_type === "after")?.url
      ?? (p.project_photos ?? [])[0]?.url;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: abs(`/gallery/${params.slug}`) },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (cover?.startsWith("https://")) {
      meta.push({ property: "og:image", content: cover });
      meta.push({ name: "twitter:image", content: cover });
    }
    return { meta, links: [{ rel: "canonical", href: abs(`/gallery/${params.slug}`) }] };
  },
  errorComponent: () => <Missing />,
  notFoundComponent: () => <Missing />,
  component: ProjectPage,
});

function Missing() {
  return (
    <PageLayout>
      <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
        <h1 className="font-display text-4xl">Project not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This project may have been unpublished.</p>
        <Link to="/gallery" className="mt-8 inline-flex rounded-md border border-border px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red">
          Back to gallery
        </Link>
      </section>
    </PageLayout>
  );
}

function PhotoGrid({ title, photos }: { title: string; photos: ProjectPhoto[] }) {
  if (!photos.length) return null;
  return (
    <div className="mt-10">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-red">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((p) => (
          <figure key={p.id}>
            <img src={p.url} alt={p.alt_text || p.caption || title} loading="lazy"
              className="w-full rounded-xl border border-border object-cover" />
            {p.caption && <figcaption className="mt-2 text-xs text-muted-foreground">{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}

function ProjectPage() {
  const { project: p } = Route.useLoaderData();
  const photos = [...(p.project_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const vehicle = [p.vehicle_year, p.vehicle_make, p.vehicle_model].filter(Boolean).join(" ");

  return (
    <PageLayout mode={p.vehicle_kind === "moto" ? "moto" : "auto"}>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <Link to="/gallery" className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-red">
              ← Gallery
            </Link>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl">{p.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {[vehicle, p.service_category, p.project_date ? new Date(p.project_date).toLocaleDateString() : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        {p.description && <p className="text-muted-foreground">{p.description}</p>}
        <dl className="mt-8 grid gap-6 sm:grid-cols-2">
          <Block k="Problem / diagnosis" v={p.problem} />
          <Block k="Work performed" v={p.work_performed} />
          <Block k="Result" v={p.result} />
          <Block k="Parts used" v={p.parts_used} />
        </dl>

        <PhotoGrid title="Before" photos={photos.filter((x) => x.image_type === "before")} />
        <PhotoGrid title="After" photos={photos.filter((x) => x.image_type === "after")} />
        <PhotoGrid title="More photos" photos={photos.filter((x) => x.image_type === "additional")} />

        <div className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl">Need something like this handled?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Mobile service across Salt Lake City — we come to you.
          </p>
          <Link
            to="/quote"
            className="mt-6 inline-flex rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
          >
            Get Quote
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

function Block({ k, v }: { k: string; v: string | null }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-red">{k}</dt>
      <dd className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{v}</dd>
    </div>
  );
}
