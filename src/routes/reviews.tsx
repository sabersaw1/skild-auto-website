import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { Star } from "lucide-react";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — What Customers Say | Skild Auto" },
      {
        name: "description",
        content:
          "Read what Salt Lake City drivers and riders say about Skild Auto's mobile service.",
      },
      { property: "og:title", content: "Skild Auto Reviews" },
      { property: "og:description", content: "Honest customers, honest reviews." },
      { property: "og:url", content: "/reviews" },
    ],
    links: [{ rel: "canonical", href: "/reviews" }],
  }),
  component: ReviewsPage,
});

const reviews = [
  {
    name: "Jason M.",
    city: "Salt Lake City, UT",
    stars: 5,
    quote: "Incredible service! They came to my house and had me back on the road in no time.",
  },
  {
    name: "Tyler D.",
    city: "Draper, UT",
    stars: 5,
    quote: "Professional, honest and convenient. Highly recommend Skild Auto.",
  },
  {
    name: "Brandon R.",
    city: "Lehi, UT",
    stars: 5,
    quote: "Best mobile mechanic I've ever used. Top notch from start to finish.",
  },
  {
    name: "Maria S.",
    city: "Sandy, UT",
    stars: 5,
    quote: "Fair pricing, clear communication and quality work. Will use again.",
  },
  {
    name: "Devin K.",
    city: "Bountiful, UT",
    stars: 5,
    quote: "Diagnosed an issue three shops missed. Saved me hundreds.",
  },
  {
    name: "Alex P.",
    city: "Provo, UT",
    stars: 5,
    quote: "Came out fast and got my bike running perfect.",
  },
];

function ReviewsPage() {
  return (
    <PageLayout>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
              Reviews
            </p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl">
              What our <span className="text-brand-red">customers</span> say
            </h1>
            <div className="mt-6 flex items-center gap-4">
              <div className="font-display text-5xl text-glow">4.9</div>
              <div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-brand-red text-brand-red" />
                  ))}
                </div>
                <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                  Based on 250+ reviews
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r, i) => (
            <Reveal key={r.name} delay={i * 60}>
              <article className="shine-border h-full rounded-xl border border-border bg-card p-6">
                <div className="flex gap-0.5">
                  {Array.from({ length: r.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-brand-red text-brand-red" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground">"{r.quote}"</p>
                <div className="mt-6 border-t border-border pt-4">
                  <div className="font-display text-sm">{r.name}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {r.city}
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span>Google</span>
          <span>Facebook</span>
          <span>Yelp</span>
          <span>Trustpilot</span>
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/quote"
            className="inline-flex rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
          >
            Become our next 5-star
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
