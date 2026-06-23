import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useState } from "react";
import { Phone, Mail, MapPin, Instagram, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Skild Auto" },
      { name: "description", content: "Reach Skild Auto by phone, email or Instagram. Salt Lake City, Utah." },
      { property: "og:title", content: "Contact Skild Auto" },
      { property: "og:description", content: "Have a question? We're here to help." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <PageLayout>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">Contact</p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">Get <span className="text-brand-red">in touch</span></h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Have a question? We're here to help.</p>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <ul className="space-y-5">
              <ContactRow icon={<Phone />} label="Phone" value="[ADD PHONE]" />
              <ContactRow icon={<Mail />} label="Email" value="[ADD EMAIL]" />
              <ContactRow icon={<MapPin />} label="Location" value="Salt Lake City, UT" />
              <ContactRow icon={<Instagram />} label="Instagram" value="@skildauto" href="https://instagram.com/skildauto" />
            </ul>

            <div className="mt-8 rounded-xl border border-border bg-card p-6">
              <h4 className="font-display text-sm tracking-widest text-brand-red">Hours</h4>
              <p className="mt-2 text-sm text-muted-foreground">Mon–Sat · 7:00 AM – 7:00 PM<br />Sunday · Closed</p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); }}
              className="rounded-2xl border border-border bg-card p-8 shadow-elevated"
            >
              <h2 className="font-display text-2xl">Send a message</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Name" required />
                <Field label="Phone" />
                <div className="sm:col-span-2"><Field label="Email" type="email" required /></div>
                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Message</span>
                    <textarea required rows={5}
                      className="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none" />
                  </label>
                </div>
              </div>
              <button type="submit"
                className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-red px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow">
                <Send className="h-4 w-4" /> {sent ? "Message sent" : "Send message"}
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </PageLayout>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const inner = (
    <div className="shine-border flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand-red/60">
      <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-red/10 text-brand-red">{icon}</span>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="font-display text-base tracking-wide">{value}</div>
      </div>
    </div>
  );
  return <li>{href ? <a href={href} target="_blank" rel="noreferrer">{inner}</a> : inner}</li>;
}

function Field({ label, type = "text", required }: { label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input required={required} type={type}
        className="mt-2 w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-red focus:outline-none" />
    </label>
  );
}
