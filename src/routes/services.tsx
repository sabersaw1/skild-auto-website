import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { Car, Bike, Wrench, Stethoscope, Battery, Droplet, Zap, ShieldCheck, Gauge, Settings, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Auto & Moto Repair | Skild Auto" },
      { name: "description", content: "Full list of automotive and motorcycle services from Skild Auto in Salt Lake City, Utah." },
      { property: "og:title", content: "Skild Auto Services" },
      { property: "og:description", content: "Diagnostics, repair, maintenance and performance — auto and moto." },
      { property: "og:url", content: "https://www.skildauto.com/services" },
    ],
    links: [{ rel: "canonical", href: "https://www.skildauto.com/services" }],
  }),
  component: ServicesPage,
});

const auto = [
  { icon: Stethoscope, name: "Diagnostics" },
  { icon: Wrench, name: "Brake Repair" },
  { icon: Battery, name: "Battery Service" },
  { icon: Droplet, name: "Oil Changes" },
  { icon: Gauge, name: "Suspension" },
  { icon: Zap, name: "Electrical" },
  { icon: Settings, name: "Starter / Alternator" },
  { icon: Wrench, name: "Engine Repair" },
  { icon: ShieldCheck, name: "Pre-Purchase Inspections" },
];

const moto = [
  { icon: Wrench, name: "Mechanical Repair" },
  { icon: Stethoscope, name: "Moto Diagnostics" },
  { icon: Gauge, name: "Maintenance" },
  { icon: Sparkles, name: "Performance Upgrades" },
  { icon: Settings, name: "Custom Builds" },
  { icon: ShieldCheck, name: "Ride-Ready Inspection" },
];

function ServicesPage() {
  return (
    <PageLayout>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Our Services</p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl">
              Expert <span className="text-brand-red">repairs</span> & maintenance,<br className="hidden sm:block" /> wherever you are.
            </h1>
          </Reveal>
        </div>
      </section>

      <ServiceBlock title="Auto" icon={<Car className="h-5 w-5" />} items={auto} ctaTo="/auto" />
      <ServiceBlock title="Moto" icon={<Bike className="h-5 w-5" />} items={moto} ctaTo="/moto" />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
          <h3 className="font-display text-3xl">Don't see what you need?</h3>
          <p className="mt-2 text-sm text-muted-foreground">We handle custom requests, performance projects and one-off jobs.</p>
          <Link to="/quote" className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow">
            Request Custom Quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

function ServiceBlock({
  title, icon, items, ctaTo,
}: { title: string; icon: React.ReactNode; items: { icon: any; name: string }[]; ctaTo: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <Reveal>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-brand-red text-white shadow-glow">{icon}</span>
          <h2 className="font-display text-3xl sm:text-4xl">{title} services</h2>
          <Link to={ctaTo} className="ml-auto hidden text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-brand-red sm:block">
            {title} home →
          </Link>
        </div>
      </Reveal>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {items.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.name} delay={i * 50}>
              <div className="shine-border group flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-brand-red/60">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-red/10 text-brand-red transition-colors group-hover:bg-brand-red group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-display text-xs tracking-widest">{s.name}</span>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
