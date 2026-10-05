import { createFileRoute, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { Car, Bike, Phone, ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import { BUSINESS, telHref } from "@/lib/business";
import sheet from "@/content/price-sheet.json";

type Row = { service?: string; item?: string; price: string; note?: string };

export const Route = createFileRoute("/prices")({
  head: () => ({
    meta: [
      { title: "Prices — Mobile Mechanic in Salt Lake City | Skild Auto" },
      {
        name: "description",
        content:
          "Posted prices: $89/hr labor, $69 diagnostics, oil changes from $59, brake pads $169/axle. Free travel in Salt Lake City.",
      },
      { property: "og:title", content: "Skild Auto Prices" },
      {
        property: "og:description",
        content: "The lowest posted prices of any mobile mechanic in Salt Lake.",
      },
      { property: "og:url", content: "https://www.skildauto.com/prices" },
    ],
    links: [{ rel: "canonical", href: "https://www.skildauto.com/prices" }],
  }),
  component: PricesPage,
});

function PriceTable({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <span className="text-brand-red">{icon}</span> {title}
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {rows.map((r) => (
          <li
            key={(r.service || r.item) as string}
            className="flex items-start justify-between gap-4 py-3"
          >
            <div>
              <p className="text-sm font-semibold">{r.service || r.item}</p>
              {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
            </div>
            <p className="whitespace-nowrap font-display text-lg text-brand-red">{r.price}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricesPage() {
  return (
    <PageLayout>
      <section className="border-b border-border bg-gradient-to-b from-card to-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
              Prices
            </p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl">
              Honest, <span className="text-brand-red">posted</span> prices.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {sheet.labor.price} labor · $69 diagnostics · free travel in Salt Lake City. We come
              to you.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={telHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand-red px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow hover:bg-brand-red-glow"
              >
                <Phone className="h-4 w-4" /> Call or text {BUSINESS.phone}
              </a>
              <Link
                to="/quote"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red"
              >
                Get a quote & book <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <PriceTable
          title="Auto"
          icon={<Car className="h-5 w-5" />}
          rows={[sheet.labor as Row, ...(sheet.auto as Row[])]}
        />
        <div className="space-y-6">
          <PriceTable title="Moto" icon={<Bike className="h-5 w-5" />} rows={sheet.moto as Row[]} />
          <PriceTable
            title="Travel & extras"
            icon={<MapPin className="h-5 w-5" />}
            rows={sheet.fees as Row[]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {sheet.promises.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Prices as of {sheet.updated}. Any discount or price match is confirmed by the owner.
          </p>
        </div>
      </section>
    </PageLayout>
  );
}
