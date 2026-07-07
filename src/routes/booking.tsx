import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { CheckCircle2, Phone, Mail } from "lucide-react";
import { BUSINESS, mailHref, telHref } from "@/lib/business";

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Booking Received — Skild Auto" },
      { name: "description", content: "Your Skild Auto booking has been received." },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  return (
    <PageLayout>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-elevated sm:p-12">
            <CheckCircle2 className="mx-auto h-14 w-14 text-brand-red" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
              Booking received
            </p>
            <h1 className="mt-3 font-display text-4xl">You're on the schedule.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We've sent a confirmation to your email and notified the shop. We'll reach out shortly
              with any final details.
            </p>
            <div className="mt-8 space-y-3 text-sm">
              <a
                href={telHref}
                className="flex items-center justify-center gap-2 hover:text-brand-red"
              >
                <Phone className="h-4 w-4 text-brand-red" /> {BUSINESS.phone}
              </a>
              <a
                href={mailHref}
                className="flex items-center justify-center gap-2 hover:text-brand-red"
              >
                <Mail className="h-4 w-4 text-brand-red" /> {BUSINESS.email}
              </a>
            </div>
            <Link
              to="/"
              className="mt-8 inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red"
            >
              Back to home
            </Link>
          </div>
        </Reveal>
      </section>
    </PageLayout>
  );
}
