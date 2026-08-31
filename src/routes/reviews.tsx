import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { listPublicReviews, type PublicReview } from "@/lib/reviews.functions";

const GOOGLE_REVIEW_URL = "https://g.page/r/CZCH7korVYMuEBI/review";

export const Route = createFileRoute("/reviews")({
  loader: async () => await listPublicReviews(),
  head: () => ({
    meta: [
      { title: "Reviews — What Customers Say | Skild Auto" },
      { name: "description", content: "Read what Salt Lake City drivers and riders say about Skild Auto's mobile service." },
      { property: "og:title", content: "Skild Auto Reviews" },
      { property: "og:description", content: "Honest customers, honest reviews." },
      { property: "og:url", content: "https://www.skildauto.com/reviews" },
    ],
    links: [{ rel: "canonical", href: "https://www.skildauto.com/reviews" }],
  }),
  errorComponent: () => <ReviewsShell reviews={[]} />,
  notFoundComponent: () => <ReviewsShell reviews={[]} />,
  component: ReviewsPage,
});

function ReviewsPage() {
  const { reviews } = Route.useLoaderData();
  return <ReviewsShell reviews={reviews} />;
}

function ReviewsShell({ reviews }: { reviews: PublicReview[] }) {
  return (
    <PageLayout>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Reviews</p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl">
              What our <span className="text-brand-red">customers</span> say
            </h1>
          </Reveal>
        </div>
      </section>

      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <Reveal key={r.id}>
                <article className="h-full rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-1 text-brand-red" aria-label={`${r.rating ?? 0} out of 5 stars`}>
                    {Array.from({ length: r.rating ?? 0 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  {r.comment && <p className="mt-4 text-sm text-muted-foreground">{r.comment}</p>}
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em]">
                    {r.reviewer_name || "Google customer"}
                  </p>
                  {r.review_created_at && (
                    <p className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {new Date(r.review_created_at).toLocaleDateString()}
                    </p>
                  )}
                </article>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <Reveal>
            <p className="text-muted-foreground">
              We value every customer experience. If you've used Skild Auto, take a moment to share your honest feedback on Google. Your review helps other drivers and riders find reliable mobile service in Salt Lake City.
            </p>
            <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
              Leave your review on Google
            </p>
            <div className="mt-8">
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
              >
                Become our next 5-star
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </PageLayout>
  );
}
