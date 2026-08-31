import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { listPublishedProjects, type PublicProject } from "@/lib/gallery.functions";
import { abs, seoLinks } from "@/lib/seo";

export const Route = createFileRoute("/gallery/")({
  loader: async () => await listPublishedProjects(),
  head: () => ({
    meta: [
      { title: "Project Gallery — Real Mobile Repairs | Skild Auto" },
      { name: "description", content: "Real cars and motorcycles repaired by Skild Auto in Salt Lake City. Before and after photos from actual mobile service jobs." },
      { property: "og:title", content: "Skild Auto Project Gallery" },
      { property: "og:description", content: "Real mobile auto and moto repair work in Salt Lake City." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: abs("/gallery") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: seoLinks("/gallery"),
  }),
  errorComponent: () => <GalleryShell projects={[]} />,
  component: GalleryPage,
});

function GalleryPage() {
  const { projects } = Route.useLoaderData();
  return <GalleryShell projects={projects} />;
}

export function coverPhoto(p: PublicProject) {
  const photos = p.project_photos ?? [];
  return (
    photos.find((x) => x.image_type === "after") ??
    photos.find((x) => x.image_type === "before") ??
    photos[0] ??
    null
  );
}

function GalleryShell({ projects }: { projects: PublicProject[] }) {
  return (
    <PageLayout>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Gallery</p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl">
              Real <span className="text-brand-red">Skild Auto</span> work
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Actual jobs completed on-site across Salt Lake City — diagnosis, work performed, and the result.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        {projects.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-10 text-center">
            <h2 className="font-display text-2xl">Projects coming soon</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              We only publish real Skild Auto jobs here. Completed projects with before and after photos will appear on this page.
            </p>
            <Link
              to="/quote"
              className="mt-8 inline-flex rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
            >
              Get Quote
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const cover = coverPhoto(p);
              const vehicle = [p.vehicle_year, p.vehicle_make, p.vehicle_model].filter(Boolean).join(" ");
              return (
                <Reveal key={p.id}>
                  <Link
                    to="/gallery/$slug"
                    params={{ slug: p.slug }}
                    className="group block h-full overflow-hidden rounded-xl border border-border bg-card transition hover:border-brand-red/60"
                  >
                    {cover && (
                      <img
                        src={cover.url}
                        alt={cover.alt_text || `${vehicle} ${p.title}`.trim()}
                        loading="lazy"
                        className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    )}
                    <div className="p-5">
                      {p.service_category && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-red">
                          {p.service_category}
                        </p>
                      )}
                      <h2 className="mt-2 font-display text-xl">{p.title}</h2>
                      {vehicle && <p className="mt-1 text-sm text-muted-foreground">{vehicle}</p>}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>
    </PageLayout>
  );
}
