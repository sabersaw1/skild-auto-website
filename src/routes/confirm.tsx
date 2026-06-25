import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useEffect, useState } from "react";
import { Calendar, Wrench, MapPin, User, Phone, Mail, Pencil, ChevronRight } from "lucide-react";
import { loadQuote, resolvedMake, resolvedModel, type QuoteData, EMPTY_QUOTE } from "@/lib/quote-storage";
import { getQuoteId, getSlot, clearBooking } from "@/lib/skild-booking";
import { createAppointment } from "@/lib/booking.functions";

export const Route = createFileRoute("/confirm")({
  head: () => ({
    meta: [
      { title: "Confirm Booking — Skild Auto" },
      { name: "description", content: "Review your Skild Auto booking and submit." },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<QuoteData>(EMPTY_QUOTE);
  const [quoteId, setQid] = useState<string | null>(null);
  const [slot, setSlotIso] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setForm(loadQuote());
    setQid(getQuoteId());
    setSlotIso(getSlot());
  }, []);

  const submit = async () => {
    if (!quoteId || !slot) {
      setErr("Missing quote or time. Please start over.");
      return;
    }
    setBusy(true); setErr(null);
    try {
      const r = await createAppointment({ data: { quoteId, startISO: slot } });
      if (!r.ok) {
        setErr(r.error || "Could not book that slot.");
        setBusy(false);
        return;
      }
      clearBooking();
      navigate({ to: "/booking" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submission failed.");
      setBusy(false);
    }
  };

  const make = resolvedMake(form);
  const model = resolvedModel(form);
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
  const when = slot
    ? new Date(slot).toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : "—";

  return (
    <PageLayout>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Confirm</p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Review & book.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Make sure everything looks right, then submit.
          </p>
        </Reveal>

        <div className="mt-10 space-y-4">
          <Card title="Appointment" right={
            <Link to="/schedule" className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-brand-red">
              <Pencil className="h-3 w-3" /> Change
            </Link>
          }>
            <Row icon={<Calendar className="h-4 w-4 text-brand-red" />} primary={when} secondary="60 minutes" />
          </Card>

          <Card title="Service" right={
            <Link to="/quote" className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-brand-red">
              <Pencil className="h-3 w-3" /> Edit
            </Link>
          }>
            <Row icon={<Wrench className="h-4 w-4 text-brand-red" />}
              primary={form.service || "—"}
              secondary={`${form.type === "moto" ? "Moto" : "Auto"} · ${form.year || "—"} ${make} ${model}`.trim()} />
            {form.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{form.description}</p>
            )}
          </Card>

          <Card title="Contact">
            <div className="space-y-2 text-sm">
              {fullName && <div className="flex items-center gap-2"><User className="h-4 w-4 text-brand-red" /> {fullName}</div>}
              {form.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-red" /> {form.phone}</div>}
              {form.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-red" /> {form.email}</div>}
              {form.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-red" /> {form.location}</div>}
            </div>
          </Card>

          {form.photos.length > 0 && (
            <Card title="Photos">
              <div className="flex flex-wrap gap-2">
                {form.photos.map((p) => (
                  <img key={p} src={p} alt="Vehicle" className="h-20 w-20 rounded-md border border-border object-cover" />
                ))}
              </div>
            </Card>
          )}

          {err && <p className="text-sm text-brand-red">{err}</p>}

          <button
            onClick={submit}
            disabled={busy || !quoteId || !slot}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-red px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow disabled:opacity-50"
          >
            {busy ? "Booking…" : (<>Submit booking <ChevronRight className="h-4 w-4" /></>)}
          </button>
        </div>
      </section>
    </PageLayout>
  );
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-widest text-brand-red">{title}</h3>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="font-display tracking-wider">{primary}</div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
      </div>
    </div>
  );
}
