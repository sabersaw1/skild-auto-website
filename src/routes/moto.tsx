import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { FeatureStrip } from "@/components/FeatureStrip";
import { Reveal } from "@/components/Reveal";
import mainBg from "@/assets/main-bg.png";
import { ArrowRight, Bike, Wrench, Gauge, Sparkles, Settings, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/moto")({
  head: () => ({
    meta: [
      { title: "Moto — Motorcycle Service That Comes To You | Skild Auto" },
      {
        name: "description",
        content:
          "Professional motorcycle maintenance, repair and performance upgrades wherever you are. Salt Lake City.",
      },
      { property: "og:title", content: "Skild Auto — Motorcycle Service" },
      {
        property: "og:description",
        content: "Repair, maintenance, diagnostics and performance for riders.",
      },
      { property: "og:url", content: "/moto" },
    ],
    links: [{ rel: "canonical", href: "/moto" }],
  }),
  component: MotoHome,
});

const services = [
  { icon: Wrench, name: "Repair", desc: "Mechanical fixes, top-end work, drivetrain & more." },
  {
    icon: Stethoscope,
    name: "Diagnostics",
    desc: "ECU scans, fault tracing, electrical analysis.",
  },
  { icon: Gauge, name: "Maintenance", desc: "Oil, chain, brakes, tires and seasonal prep." },
  { icon: Sparkles, name: "Performance", desc: "Exhausts, intakes, tuning & power upgrades." },
  { icon: Settings, name: "Custom Work", desc: "One-off builds, mods and personal projects." },
  {
    icon: Bike,
    name: "Ride-Ready Check",
    desc: "Pre-ride inspection so you ride with confidence.",
  },
];

function MotoHome() {
  return (
    <PageLayout mode="moto">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={mainBg} alt="" className="h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
              Moto · Salt Lake City
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] text-glow sm:text-6xl md:text-7xl">
              Motorcycle service
              <br />
              that <span className="text-brand-red">comes</span> to you
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground">
              Professional maintenance, repair, performance and custom work — wherever you ride or
              park.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow hover:shadow-glow-strong"
              >
                Get Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-foreground backdrop-blur hover:border-brand-red hover:text-brand-red"
              >
                Schedule Service
              </Link>
            </div>
          </div>

          <div className="mt-14">
            <FeatureStrip />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
            For riders
          </p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Moto Services</h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.name} delay={i * 70}>
                <div className="shine-border group h-full rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-brand-red/60">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-red/10 text-brand-red transition-colors group-hover:bg-brand-red group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-lg">{s.name}</h3>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </PageLayout>
  );
}
