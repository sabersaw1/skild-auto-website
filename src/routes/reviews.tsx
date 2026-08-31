import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";

const GOOGLE_REVIEW_URL = "https://g.page/r/CZCH7korVYMuEBI/review";

export const Route = createFileRoute("/reviews")({
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
  component: ReviewsPage,
});

function ReviewsPage() {
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
