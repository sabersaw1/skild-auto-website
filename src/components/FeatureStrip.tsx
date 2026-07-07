import { Truck, ShieldCheck, Settings2, Zap } from "lucide-react";

const items = [
  { icon: Truck, title: "Mobile Service", sub: "We come to you" },
  { icon: ShieldCheck, title: "Expert Techs", sub: "Certified & trusted" },
  { icon: Settings2, title: "Quality Parts", sub: "Built to last" },
  { icon: Zap, title: "Fast Response", sub: "We're ready" },
];

export function FeatureStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.title}
            className="shine-border group flex items-center gap-3 rounded-lg border border-border bg-card/80 p-4 backdrop-blur transition-all hover:bg-card"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-red/10 text-brand-red transition-all group-hover:bg-brand-red group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="font-display text-xs tracking-widest">{it.title}</div>
              <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
                {it.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
