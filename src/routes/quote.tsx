import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useEffect, useMemo, useState } from "react";
import {
  Car, Bike, ChevronLeft, ChevronRight, Wrench, Zap, Gauge, Stethoscope,
  Sparkles, Settings, Camera, X, Calendar,
} from "lucide-react";
import {
  EMPTY_QUOTE, loadQuote, saveQuote, type QuoteData,
} from "@/lib/quote-storage";
import { getMakes, getModels, getYears, OTHER } from "@/lib/vehicles";
import { uploadQuotePhoto } from "@/lib/quote-photos";
import {
  submitQuote, markQuoteSubmitted, wasQuoteSubmitted, type QuoteAttachment,
} from "@/lib/quote-submit";

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

const steps = ["Type", "Service", "Vehicle", "Details", "Contact", "Schedule"];

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
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<QuoteData>(EMPTY_QUOTE);
  const [hydrated, setHydrated] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hydrate from sessionStorage so customer data persists across visits.
  useEffect(() => {
    setForm(loadQuote());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) saveQuote(form);
  }, [form, hydrated]);

  const services = useMemo(() => (form.type === "moto" ? motoServices : autoServices), [form.type]);
  const makes = useMemo(() => (form.type ? getMakes(form.type) : []), [form.type]);
  const models = useMemo(
    () => (form.type && form.make ? getModels(form.type, form.make) : []),
    [form.type, form.make],
  );
  const years = useMemo(() => (form.type ? getYears(form.type) : []), [form.type]);

  const update = <K extends keyof QuoteData>(k: K, v: QuoteData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const canNext = () => {
    switch (step) {
      case 0: return form.type !== null;
      case 1: return !!form.service;
      case 2:
        return !!form.year && !!form.make && !!form.model
          && (form.make !== OTHER || !!form.makeOther.trim())
          && (form.model !== OTHER || !!form.modelOther.trim());
      case 3: return true; // description optional
      case 4:
        return !!form.firstName.trim() && !!form.lastName.trim()
          && !!form.phone.trim() && !!form.email.trim();
      default: return true;
    }
  };

  const onPhotoSelect = async (files: FileList | null) => {
    if (!files) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const remaining = Math.max(0, 4 - form.photos.length);
      const picked = Array.from(files).slice(0, remaining);
      const uploads = await Promise.all(picked.map((f) => uploadQuotePhoto(f)));
      const urls = uploads.map((u) => u.url);
      const newAttachments: QuoteAttachment[] = uploads.map((u) => ({
        filename: u.filename,
        contentType: u.contentType,
        base64: u.base64,
      }));
      setAttachments((prev) => [...prev, ...newAttachments].slice(0, 4));
      update("photos", [...form.photos, ...urls].slice(0, 4));
    } catch (err) {
      console.error("photo upload failed", err);
      setPhotoError(
        err instanceof Error ? err.message : "Photo upload failed. Please try again.",
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const goSchedule = async () => {
    // Fire-and-confirm the quote notification email before sending the
    // customer to Calendly. Idempotent per saved quote: re-clicking from
    // the same session won't send a duplicate email.
    const fingerprint = JSON.stringify({
      e: form.email, p: form.phone, s: form.service, d: form.description,
    });
    if (submitState !== "sent" && !wasQuoteSubmitted(fingerprint)) {
      setSubmitState("sending");
      setSubmitError(null);
      try {
        await submitQuote(form);
        markQuoteSubmitted(fingerprint);
        setSubmitState("sent");
      } catch (err) {
        console.error("quote submission failed", err);
        setSubmitState("error");
        setSubmitError(
          err instanceof Error ? err.message : "Could not send quote notification.",
        );
        // Still let the customer continue — booking matters more than email.
      }
    }
    navigate({ to: "/booking" });
  };

  return (
    <PageLayout>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Interactive Quote</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Let's get you a number.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Answer once — your info follows you all the way to scheduling.
          </p>
        </Reveal>

        {/* Stepper */}
        <div className="mt-10 flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {steps.map((label, i) => (
            <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-bold transition ${
                  i <= step ? "border-brand-red bg-brand-red text-white shadow-glow" : "border-border bg-card text-muted-foreground"
                }`}
              >{i + 1}</button>
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
                <ChoiceBig active={form.type === "auto"} onClick={() => { update("type", "auto"); update("make", ""); update("model", ""); next(); }}
                  icon={<Car className="h-7 w-7" />} label="Auto" sub="Cars, trucks, SUVs" />
                <ChoiceBig active={form.type === "moto"} onClick={() => { update("type", "moto"); update("make", ""); update("model", ""); next(); }}
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
                    <button key={s.name} type="button" onClick={() => update("service", s.name)}
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
                <Select label="Year" value={form.year} onChange={(v) => update("year", v)} options={years} placeholder="Select year" />
                <Select label="Make" value={form.make}
                  onChange={(v) => { update("make", v); update("model", ""); update("modelOther", ""); }}
                  options={makes} placeholder="Select make" />
                <Select label="Model" value={form.model}
                  onChange={(v) => update("model", v)} options={models}
                  placeholder={form.make ? "Select model" : "Pick a make first"}
                  disabled={!form.make} />
                {form.make === OTHER && (
                  <Field label="Make (please specify)" value={form.makeOther} onChange={(v) => update("makeOther", v)} placeholder="Enter make" />
                )}
                {form.model === OTHER && (
                  <Field label="Model (please specify)" value={form.modelOther} onChange={(v) => update("modelOther", v)} placeholder="Enter model" />
                )}
                <Field label="Mileage (optional)" value={form.mileage} onChange={(v) => update("mileage", v)} placeholder="62,000" />
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Don't see your vehicle? Choose <span className="text-brand-red">Other</span> and type it in.
              </p>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell title="Describe the issue">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Problem description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={5}
                  placeholder="Symptoms, sounds, warning lights, when it started…"
                  className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-brand-red focus:outline-none"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Additional notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  rows={3}
                  placeholder="Access info, gate codes, preferred contact method…"
                  className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:border-brand-red focus:outline-none"
                />
              </label>

              <div className="mt-6">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Photos (optional)</span>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {form.photos.map((p) => (
                    <div key={p} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                      <img src={p} alt="Uploaded" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => update("photos", form.photos.filter((x) => x !== p))}
                        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-foreground"
                        aria-label="Remove photo"
                      ><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                  {form.photos.length < 4 && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background text-[10px] uppercase tracking-widest text-muted-foreground hover:border-brand-red hover:text-brand-red">
                      <Camera className="h-5 w-5" />
                      Add
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => onPhotoSelect(e.target.files)}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {photoBusy ? "Uploading…" : "Photos help us quote faster. Up to 4."}
                </p>
                {photoError && (
                  <p className="mt-1 text-[11px] text-brand-red">{photoError}</p>
                )}
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Contact & location">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={form.firstName} onChange={(v) => update("firstName", v)} placeholder="Johnny" />
                <Field label="Last name" value={form.lastName} onChange={(v) => update("lastName", v)} placeholder="Green" />
                <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} placeholder="(801) 555-0100" type="tel" />
                <Field label="Email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@email.com" type="email" />
                <div className="sm:col-span-2">
                  <Field label="Service location / address" value={form.location} onChange={(v) => update("location", v)} placeholder="Street, city, ZIP — where we should meet you" />
                </div>
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Schedule your appointment">
              <div className="rounded-xl border border-border bg-background p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-red/10 text-brand-red">
                    <Calendar className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg">You're all set, {form.firstName || "rider"}.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick a date and time on the next screen. Everything you entered will be passed
                      straight into the booking — you won't need to repeat anything.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={goSchedule}
                disabled={submitState === "sending"}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-red px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow animate-pulse-red disabled:opacity-60"
              >
                {submitState === "sending"
                  ? "Sending your quote…"
                  : (<>Continue to scheduling <ChevronRight className="h-4 w-4" /></>)}
              </button>
              {submitState === "error" && (
                <p className="mt-3 text-xs text-brand-red">
                  Quote saved locally, but the notification email failed: {submitError}.
                  You can still continue to scheduling — we'll see your details on the calendar.
                </p>
              )}
            </StepShell>
          )}

          {step < steps.length - 1 && (
            <div className="mt-10 flex items-center justify-between gap-4">
              <button onClick={prev} disabled={step === 0}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={next} disabled={!canNext()}
                className="inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow disabled:opacity-40">
                Next Step <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
    <button onClick={onClick} type="button"
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

function Select({
  label, value, onChange, options, placeholder, disabled,
}: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-brand-red focus:outline-none disabled:opacity-50"
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
