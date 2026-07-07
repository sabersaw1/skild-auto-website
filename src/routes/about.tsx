import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { CheckCircle2, Award, Users, Wrench, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Johnny Green & Skild Auto" },
      {
        name: "description",
        content:
          "Skild Auto was founded by Johnny Green with 8+ years of automotive and motorcycle experience to bring honest, fair, mobile service to Salt Lake City.",
      },
      { property: "og:title", content: "About Skild Auto" },
      {
        property: "og:description",
        content: "Honest service. Fair pricing. Built around the community.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const reasons = [
  "Mobile Convenience",
  "Certified Technicians",
  "Transparent Pricing",
  "Quality Parts",
  "Satisfaction Guaranteed",
];

function AboutPage() {
  return (
    <PageLayout>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2 md:items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">About</p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl">
              Why choose <span className="text-brand-red">Skild Auto?</span>
            </h1>
            <p className="mt-6 text-base text-muted-foreground">
              Skild Auto was created by Johnny Green to bring honest automotive service to the Salt
              Lake City community — fair pricing, better communication, and a better experience than
              the traditional shop visit.
            </p>
            <ul className="mt-8 space-y-3">
              {reasons.map((r) => (
                <li key={r} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-brand-red" />
                  <span className="font-semibold uppercase tracking-wider">{r}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/quote"
              className="mt-8 inline-flex rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
            >
              Learn More
            </Link>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-4">
              <Stat icon={<Award className="h-5 w-5" />} kpi="8+" label="Years experience" />
              <Stat icon={<Wrench className="h-5 w-5" />} kpi="100+" label="Vehicles serviced" />
              <Stat icon={<Users className="h-5 w-5" />} kpi="SLC" label="Community-first" />
              <Stat icon={<Heart className="h-5 w-5" />} kpi="100%" label="Honest service" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
            The Story
          </p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">
            Built by a wrench, for the road.
          </h2>
          <div className="mt-8 space-y-5 text-base text-muted-foreground">
            <p>
              Johnny Green has spent the last 8 years working on cars and motorcycles — from
              everyday maintenance to performance projects and custom builds. He's worked on over
              100 vehicles, learning what owners really want from a mechanic: trust, clear
              communication and fair pricing.
            </p>
            <p>
              Skild Auto exists to deliver exactly that. No upsell pressure. No shop visit. No
              surprises. Just a technician who shows up, explains everything, and gets the job done
              right.
            </p>
            <p>
              This is just the first layer of the Skild Auto ecosystem — a community-driven brand
              built around honest service, fair quotes and a positive customer experience.
            </p>
          </div>
        </Reveal>
      </section>
    </PageLayout>
  );
}

function Stat({ icon, kpi, label }: { icon: React.ReactNode; kpi: string; label: string }) {
  return (
    <div className="shine-border rounded-xl border border-border bg-card p-6">
      <span className="inline-grid h-10 w-10 place-items-center rounded-md bg-brand-red/10 text-brand-red">
        {icon}
      </span>
      <div className="mt-4 font-display text-4xl text-glow">{kpi}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
