import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useState } from "react";
import { Calendar, Clock, MapPin, Wrench } from "lucide-react";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Book Service — Skild Auto" },
      { name: "description", content: "Schedule your mobile auto or motorcycle service with Skild Auto." },
      { property: "og:title", content: "Schedule Skild Auto Service" },
      { property: "og:description", content: "Pick a date and time that works for you." },
      { property: "og:url", content: "/booking" },
    ],
    links: [{ rel: "canonical", href: "/booking" }],
  }),
  component: BookingPage,
});

function BookingPage() {
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <PageLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Booking</p>
          <h1 className="mt-3 font-display text-5xl">Schedule your <span className="text-brand-red">service</span></h1>
          <p className="mt-3 text-sm text-muted-foreground">Pick a date and time that works for you. Final confirmation by call/text.</p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
            <h2 className="font-display text-2xl">Schedule your service</h2>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Service</span>
                <select
                  value={service} onChange={(e) => setService(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none"
                >
                  <option value="">Select a service</option>
                  <option>Diagnostics</option>
                  <option>Brake Repair</option>
                  <option>Oil & Maintenance</option>
                  <option>Electrical</option>
                  <option>Motorcycle Service</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none" />
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Time</span>
                <select value={time} onChange={(e) => setTime(e.target.value)}
                  className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none">
                  <option value="">Select a time</option>
                  <option>7:00 AM</option><option>9:00 AM</option><option>11:00 AM</option>
                  <option>1:00 PM</option><option>3:00 PM</option><option>5:00 PM</option>
                </select>
              </label>

              <button
                onClick={() => setSubmitted(true)}
                disabled={!service || !date || !time}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow disabled:opacity-40"
              >
                {submitted ? "Booking received" : "Confirm booking"}
              </button>

              <p className="text-[11px] text-muted-foreground">
                Future integration placeholder: Google Calendar / Calendly.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display text-sm tracking-widest text-brand-red">Your Service</h3>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3"><Wrench className="mt-0.5 h-4 w-4 text-brand-red" /><div><div className="font-display tracking-wider">{service || "—"}</div><div className="text-xs text-muted-foreground">Selected service</div></div></li>
              <li className="flex gap-3"><Calendar className="mt-0.5 h-4 w-4 text-brand-red" /><div><div className="font-display tracking-wider">{date || "—"}</div><div className="text-xs text-muted-foreground">Date</div></div></li>
              <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 text-brand-red" /><div><div className="font-display tracking-wider">{time || "—"}</div><div className="text-xs text-muted-foreground">Time</div></div></li>
              <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 text-brand-red" /><div><div className="font-display tracking-wider">Mobile · SLC</div><div className="text-xs text-muted-foreground">We come to you</div></div></li>
            </ul>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}
