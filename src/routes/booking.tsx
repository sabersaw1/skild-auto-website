import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Phone, Mail, MapPin, Wrench, Pencil } from "lucide-react";
import {
  EMPTY_QUOTE, loadQuote, quoteSummary, resolvedMake, resolvedModel, type QuoteData,
} from "@/lib/quote-storage";
import { BUSINESS, mailHref, telHref } from "@/lib/business";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book Service — Skild Auto" },
      { name: "description", content: "Schedule your mobile auto or motorcycle service with Skild Auto via Calendly." },
      { property: "og:title", content: "Schedule Skild Auto Service" },
      { property: "og:description", content: "Pick a date and time that works for you." },
      { property: "og:url", content: "/booking" },
    ],
    links: [{ rel: "canonical", href: "/booking" }],
  }),
  component: BookingPage,
});

function BookingPage() {
  const [form, setForm] = useState<QuoteData>(EMPTY_QUOTE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setForm(loadQuote());
    setHydrated(true);
  }, []);

  const calendlyUrl = useMemo(() => {
    const url = new URL(BUSINESS.calendlyUrl);
    url.searchParams.set("hide_landing_page_details", "1");
    url.searchParams.set("hide_gdpr_banner", "1");
    url.searchParams.set("background_color", "0a0608");
    url.searchParams.set("text_color", "ffffff");
    url.searchParams.set("primary_color", "dc1e28");

    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
    if (fullName) url.searchParams.set("name", fullName);
    if (form.email) url.searchParams.set("email", form.email);

    // Calendly custom answers (a1..a10) — Skild Auto uses a1 for the
    // full intake summary so techs see everything in the event details.
    url.searchParams.set("a1", quoteSummary(form));
    if (form.phone) url.searchParams.set("a2", form.phone);
    if (form.location) url.searchParams.set("a3", form.location);

    return url.toString();
  }, [form]);

  const make = resolvedMake(form);
  const model = resolvedModel(form);
  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ");
  const hasIntake = hydrated && (form.type || form.service || fullName);

  return (
    <PageLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Booking</p>
          <h1 className="mt-3 font-display text-5xl">
            Schedule your <span className="text-brand-red">service</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Pick a date and time below. Everything you told us in the quote is sent with the
            booking — you don't need to enter it again.
          </p>
        </Reveal>

        {!hasIntake && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
            <span className="text-muted-foreground">Haven't done the quick quote yet? </span>
            <Link to="/quote" className="font-bold uppercase tracking-widest text-brand-red hover:underline">
              Start the quote →
            </Link>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Calendly embed */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <iframe
              title="Skild Auto — Schedule appointment"
              src={calendlyUrl}
              className="block h-[760px] w-full border-0"
              loading="lazy"
            />
          </div>

          {/* Intake summary sidebar */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm tracking-widest text-brand-red">Your Intake</h3>
                <Link to="/quote" className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-brand-red">
                  <Pencil className="h-3 w-3" /> Edit
                </Link>
              </div>
              <ul className="mt-4 space-y-4 text-sm">
                <Row icon={<Wrench className="h-4 w-4 text-brand-red" />}
                  primary={form.service || "—"} secondary="Requested service" />
                <Row icon={<Calendar className="h-4 w-4 text-brand-red" />}
                  primary={form.type ? `${form.type === "moto" ? "Moto" : "Auto"} · ${form.year || "—"}` : "—"}
                  secondary={`${make || "—"} ${model || ""}`.trim() || "Vehicle"} />
                <Row icon={<MapPin className="h-4 w-4 text-brand-red" />}
                  primary={form.location || "Mobile · SLC"} secondary="Service location" />
              </ul>

              {(fullName || form.phone || form.email) && (
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  {fullName && <div className="font-display text-sm tracking-wide text-foreground">{fullName}</div>}
                  {form.phone && <div className="mt-1">{form.phone}</div>}
                  {form.email && <div>{form.email}</div>}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-sm tracking-widest text-brand-red">Prefer to talk?</h3>
              <div className="mt-4 space-y-3 text-sm">
                <a href={telHref} className="flex items-center gap-3 hover:text-brand-red">
                  <Phone className="h-4 w-4 text-brand-red" /> {BUSINESS.phone}
                </a>
                <a href={mailHref} className="flex items-center gap-3 hover:text-brand-red">
                  <Mail className="h-4 w-4 text-brand-red" /> {BUSINESS.email}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}

function Row({ icon, primary, secondary }: { icon: React.ReactNode; primary: string; secondary: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5">{icon}</span>
      <div>
        <div className="font-display tracking-wider">{primary}</div>
        <div className="text-xs text-muted-foreground">{secondary}</div>
      </div>
    </li>
  );
}
