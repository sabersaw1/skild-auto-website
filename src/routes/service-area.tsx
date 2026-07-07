import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useState } from "react";
import { MapPin, CheckCircle2, Search } from "lucide-react";

export const Route = createFileRoute("/service-area")({
  head: () => ({
    meta: [
      { title: "Service Area — Salt Lake City | Skild Auto" },
      {
        name: "description",
        content:
          "Check if Skild Auto services your area across Salt Lake County and surrounding cities in Utah.",
      },
      { property: "og:title", content: "Skild Auto Service Area" },
      { property: "og:description", content: "Mobile service across the Salt Lake City region." },
      { property: "og:url", content: "/service-area" },
    ],
    links: [{ rel: "canonical", href: "/service-area" }],
  }),
  component: ServiceAreaPage,
});

const coverage = [
  "Salt Lake County",
  "Davis County",
  "Utah County",
  "Weber County",
  "Tooele County",
];

function ServiceAreaPage() {
  const [zip, setZip] = useState("");
  const [status, setStatus] = useState<null | "yes" | "no">(null);

  const check = () => {
    if (!zip.trim()) return;
    // Naive demo: most UT 84xxx codes covered
    setStatus(zip.startsWith("84") ? "yes" : "no");
  };

  return (
    <PageLayout>
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
            Service Area
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">
            Check your <span className="text-brand-red">area</span>
          </h1>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
              <p className="text-sm text-muted-foreground">
                Enter your ZIP code to see if we service your area.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="84070"
                  className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-sm focus:border-brand-red focus:outline-none"
                />
                <button
                  onClick={check}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-red px-5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
                >
                  <Search className="h-4 w-4" /> Check
                </button>
              </div>

              {status === "yes" && (
                <div className="mt-6 flex items-start gap-3 rounded-md border border-brand-red/40 bg-brand-red/10 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-red" />
                  <div>
                    <div className="font-display text-sm text-brand-red">We service your area!</div>
                    <div className="text-xs text-muted-foreground">
                      Salt Lake County, UT and surrounding areas.
                    </div>
                  </div>
                </div>
              )}
              {status === "no" && (
                <div className="mt-6 rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                  We don't currently service that ZIP — but message us anyway, we expand often.
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-red">
                  Coverage areas
                </h3>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {coverage.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-brand-red" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-border bg-card">
              {/* Stylized map placeholder */}
              <div
                className="absolute inset-0 opacity-50"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(220,30,40,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(220,30,40,0.15) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-red shadow-glow-strong" />
              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-red animate-pulse-red" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[140px]">
                <Pin label="Ogden" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-[110px] -translate-y-[60px]">
                <Pin label="Layton" />
              </div>
              <div className="absolute left-1/2 top-1/2 translate-x-[80px] -translate-y-[30px]">
                <Pin label="Bountiful" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-[24px] translate-y-[14px]">
                <Pin label="Salt Lake City" highlight />
              </div>
              <div className="absolute left-1/2 top-1/2 translate-x-[40px] translate-y-[80px]">
                <Pin label="Sandy" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-[140px] translate-y-[120px]">
                <Pin label="Tooele" />
              </div>
              <div className="absolute left-1/2 top-1/2 translate-x-[100px] translate-y-[160px]">
                <Pin label="Provo" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageLayout>
  );
}

function Pin({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <MapPin className={`h-4 w-4 ${highlight ? "text-brand-red" : "text-muted-foreground"}`} />
      <span
        className={`text-[11px] font-semibold uppercase tracking-wider ${highlight ? "text-brand-red" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
