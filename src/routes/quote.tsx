import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useMemo, useState } from "react";
import { Car, Bike, ChevronLeft, ChevronRight, CheckCircle2, Wrench, Zap, Gauge, Stethoscope, Sparkles, Settings } from "lucide-react";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "Get a Quote — Skild Auto" },
      { name: "description", content: "Tell us about your vehicle and we'll get back to you fast with an honest mobile service quote." },
      { property: "og:title", content: "Get a Skild Auto Quote" },
      { property: "og:description", content: "Interactive quote in under 2 minutes." },
      { property: "og:url", content: "/quote" },
    ],
    links: [{ rel: "canonical", href: "/quote" }],
  }),
  component: QuotePage,
});

type Form = {
  type: "auto" | "moto" | null;
  service: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  description: string;
  name: string;
  phone: string;
  email: string;
  zip: string;
  preferredDate: string;
};

const steps = ["Type", "Service", "Vehicle", "Details", "Location", "Schedule"];

const autoServices = [
  { icon: Stethoscope, name: "Diagnostics" },
  { icon: Wrench, name: "Brakes" },
  { icon: Gauge, name: "Suspension" },
  { icon: Zap, name: "Electrical" },
  { icon: Settings, name: "Engine" },
  { icon: Wrench, name: "Other" },
];
const motoServices = [
  { icon: Wrench, name: "Repair" },
  { icon: Gauge, name: "Maintenance" },
  { icon: Stethoscope, name: "Diagnostics" },
  { icon: Sparkles, name: "Performance" },
  { icon: Settings, name: "Custom" },
  { icon: Wrench, name: "Other" },
];

function QuotePage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<Form>({
    type: null, service: "", year: "", make: "", model: "", mileage: "",
    description: "", name: "", phone: "", email: "", zip: "", preferredDate: "",
  });

  const services = useMemo(() => (form.type === "moto" ? motoServices : autoServices), [form.type]);
  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    // Future: POST to /api/leads -> Neon DB
    console.info("[skild-auto] lead captured", form);
    setDone(true);
  };

  if (done) {
    return (
      <PageLayout>
        <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-32 text-center sm:px-6">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-red/10 text-brand-red shadow-glow">
            <CheckCircle2 className="h-10 w-10" />
          </span>
          <h1 className="mt-8 font-display text-4xl sm:text-5xl">Quote received</h1>
          <p className="mt-4 text-muted-foreground">
            Thanks {form.name || "—"}, we'll get back to you within a few hours with your honest quote and next steps.
          </p>
        </section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Interactive Quote</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Let's get you a number.</h1>
        </Reveal>

        {/* Stepper */}
        <div className="mt-10 flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((label, i) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                i <= step ? "border-brand-red bg-brand-red text-white shadow-glow" : "border-border bg-card text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`hidden truncate text-[10px] font-bold uppercase tracking-widest sm:inline ${
                i === step ? "text-brand-red" : "text-muted-foreground"
              }`}>{label}</span>
              {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-brand-red" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-elevated sm:p-10">
          {step === 0 && (
            <StepShell title="What needs service?">
              <div className="grid gap-4 sm:grid-cols-2">
                <ChoiceBig active={form.type === "auto"} onClick={() => { update("type", "auto"); next(); }}
                  icon={<Car className="h-7 w-7" />} label="Auto" sub="Cars, trucks, SUVs" />
                <ChoiceBig active={form.type === "moto"} onClick={() => { update("type", "moto"); next(); }}
                  icon={<Bike className="h-7 w-7" />} label="Moto" sub="Motorcycles" />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="Select a service">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {services.map((s) => {
                  const Icon = s.icon;
                  const active = form.service === s.name;
                  return (
                    <button key={s.name} onClick={() => { update("service", s.name); }}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-5 transition-all ${
                        active ? "border-brand-red bg-brand-red/10 shadow-glow" : "border-border bg-background hover:border-brand-red/60"
                      }`}>
                      <Icon className={`h-6 w-6 ${active ? "text-brand-red" : "text-muted-foreground"}`} />
                      <span className="font-display text-xs tracking-widest">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Vehicle info">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Year" value={form.year} onChange={(v) => update("year", v)} placeholder="2018" />
                <Field label="Make" value={form.make} onChange={(v) => update("make", v)} placeholder="BMW" />
                <Field label="Model" value={form.model} onChange={(v) => update("model", v)} placeholder="330i" />
                <Field label="Mileage" value={form.mileage} onChange={(v) => update("mileage", v)} placeholder="62,000" />
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Describe the issue">
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={6}
                placeholder="Symptoms, sounds, warning lights, when it started…"
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-brand-red focus:outline-none"
              />
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Where are we headed?">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" value={form.name} onChange={(v) => update("name", v)} placeholder="Johnny Green" />
                <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(801) 555-0100" />
                <Field label="Email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@email.com" />
                <Field label="ZIP code" value={form.zip} onChange={(v) => update("zip", v)} placeholder="84070" />
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Preferred date">
              <Field label="When works?" type="date" value={form.preferredDate} onChange={(v) => update("preferredDate", v)} />
              <p className="mt-4 text-xs text-muted-foreground">We'll confirm via call or text within a few hours.</p>
            </StepShell>
          )}

          <div className="mt-10 flex items-center justify-between gap-4">
            <button onClick={prev} disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            {step < steps.length - 1 ? (
              <button onClick={next}
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow">
                Next Step <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submit}
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow animate-pulse-red">
                Submit Quote
              </button>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function StepShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-slide-up">
      <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function ChoiceBig({ icon, label, sub, active, onClick }: { icon: React.ReactNode; label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`group flex items-center gap-4 rounded-xl border p-6 text-left transition-all ${
        active ? "border-brand-red bg-brand-red/10 shadow-glow" : "border-border bg-background hover:border-brand-red/60 hover:-translate-y-0.5"
      }`}>
      <span className="grid h-14 w-14 place-items-center rounded-lg bg-brand-red/10 text-brand-red">{icon}</span>
      <div>
        <div className="font-display text-3xl">{label}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{sub}</div>
      </div>
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-brand-red focus:outline-none"
      />
    </label>
  );
}
