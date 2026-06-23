import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { FeatureStrip } from "@/components/FeatureStrip";
import { Reveal } from "@/components/Reveal";
import mobileBg from "@/assets/mobile-bg.png.asset.json";
import { ArrowRight, Wrench, Gauge, Battery, Zap, ShieldCheck, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/auto")({
  head: () => ({
    meta: [
      { title: "Auto — Mobile Automotive Repair | Skild Auto" },
      { name: "description", content: "Mobile auto repair without the shop visit. Diagnostics, brakes, electrical and maintenance across Salt Lake City, UT." },
      { property: "og:title", content: "Skild Auto — Mobile Automotive Repair" },
      { property: "og:description", content: "Diagnostics, repairs, maintenance and emergency service brought directly to you." },
      { property: "og:url", content: "/auto" },
    ],
    links: [{ rel: "canonical", href: "/auto" }],
  }),
  component: AutoHome,
});

const services = [
  { icon: Stethoscope, name: "Diagnostics", desc: "Computerized scanning, error code analysis & root cause." },
  { icon: Wrench, name: "Brake Service", desc: "Pads, rotors, fluid flushes — done at your driveway." },
  { icon: Battery, name: "Battery & Starter", desc: "Testing, replacement & charging system repair." },
  { icon: Zap, name: "Electrical", desc: "Wiring, sensors, lights and component diagnostics." },
  { icon: Gauge, name: "Maintenance", desc: "Oil, filters, fluids and scheduled inspections." },
  { icon: ShieldCheck, name: "Pre-Purchase", desc: "Independent inspections before you buy." },
];

function AutoHome() {
  return (
    <PageLayout mode="auto">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={mobileBg.url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="pointer-events-none absolute right-[8%] top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-70 animate-flicker" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Auto · Salt Lake City</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.95] text-glow sm:text-6xl md:text-7xl">
              Mobile auto repair<br />
              <span className="text-brand-red">without</span> the shop visit
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground">
              Diagnostics, repairs, maintenance and emergency service brought directly to your driveway, office, or roadside.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow transition-all hover:bg-brand-red-glow hover:shadow-glow-strong"
              >
                Get Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-foreground backdrop-blur hover:border-brand-red hover:text-brand-red"
              >
                View Services
              </Link>
            </div>
          </div>

          <div className="mt-14">
            <FeatureStrip />
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">What we do</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Auto Services</h2>
            </div>
            <Link to="/services" className="hidden text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-brand-red sm:block">
              All services →
            </Link>
          </div>
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

      <CtaBand />
    </PageLayout>
  );
}

function CtaBand() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/60">
      <div className="absolute inset-0 opacity-30 scanlines" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Ready to roll</p>
          <h3 className="mt-2 font-display text-3xl sm:text-4xl">Get your fast, honest quote.</h3>
        </div>
        <Link
          to="/quote"
          className="inline-flex items-center gap-2 rounded-md bg-brand-red px-7 py-3.5 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
        >
          Start Quiz <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
