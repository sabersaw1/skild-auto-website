import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import skildLogo from "@/assets/skild-logo.png.asset.json";
import { BUSINESS, telHref } from "@/lib/business";


interface SiteNavProps {
  mode?: "auto" | "moto" | "neutral";
}

const links = [
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/service-area", label: "Service Area" },
  { to: "/reviews", label: "Reviews" },
  { to: "/apparel", label: "Apparel" },
  { to: "/contact", label: "Contact" },
];

export function SiteNav({ mode = "neutral" }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  void mode;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="Skild Auto — Home" className="group flex min-w-0 items-center">
          <img
            src={skildLogo.url}
            alt="Skild Auto"
            className="h-16 w-auto transition-transform duration-300 group-hover:scale-[1.04] sm:h-20"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-brand-red" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={telHref}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-foreground hover:border-brand-red hover:text-brand-red"
          >
            <Phone className="h-3.5 w-3.5" /> {BUSINESS.phone}
          </a>
          <Link
            to="/quote"
            className="inline-flex items-center rounded-md bg-brand-red px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-glow transition-all hover:bg-brand-red-glow hover:shadow-glow-strong"
          >
            Get Quote
          </Link>
        </div>


        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          className="grid h-10 w-10 place-items-center rounded-md border border-border bg-card lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/40 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <a
              href={telHref}
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-foreground"
            >
              <Phone className="h-4 w-4 text-brand-red" /> {BUSINESS.phone}
            </a>
            <Link
              to="/quote"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-brand-red px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-glow"
            >
              Get Quote
            </Link>

          </nav>
        </div>
      )}
    </header>
  );
}
