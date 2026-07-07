import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useState } from "react";
import { Shirt, Bell } from "lucide-react";

export const Route = createFileRoute("/apparel")({
  head: () => ({
    meta: [
      { title: "Apparel — Coming Soon | Skild Auto" },
      { name: "description", content: "Premium Skild Auto apparel and merch. Coming soon." },
      { property: "og:title", content: "Skild Auto Apparel" },
      { property: "og:description", content: "Premium Skild Auto merchandise — coming soon." },
      { property: "og:url", content: "/apparel" },
    ],
    links: [{ rel: "canonical", href: "/apparel" }],
  }),
  component: ApparelPage,
});

function ApparelPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <PageLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-background" />
          <div className="absolute inset-0 opacity-30 scanlines" />
          <div className="pointer-events-none absolute left-1/4 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-50 animate-flicker" />
          <div
            className="pointer-events-none absolute right-1/4 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-50 animate-flicker"
            style={{ animationDelay: "0.8s" }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
          <Reveal>
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-red/10 text-brand-red shadow-glow">
              <Shirt className="h-10 w-10" />
            </span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.4em] text-brand-red">
              Apparel
            </p>
            <h1 className="mt-3 font-display text-5xl text-glow sm:text-7xl">Coming soon</h1>
            <p className="mx-auto mt-5 max-w-md text-sm text-muted-foreground">
              Premium Skild Auto apparel built for drivers, riders and builders. Drop notifications
              first.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) setDone(true);
              }}
              className="mx-auto mt-10 flex w-full max-w-md gap-2"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-md border border-border bg-card px-4 py-3 text-sm focus:border-brand-red focus:outline-none"
              />
              <button className="inline-flex items-center gap-2 rounded-md bg-brand-red px-5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow">
                <Bell className="h-4 w-4" /> {done ? "On the list" : "Notify me"}
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </PageLayout>
  );
}
