import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, ArrowRight } from "lucide-react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";
import { BUSINESS, telHref } from "@/lib/business";

export function PageLayout({
  children,
  mode = "neutral",
}: {
  children: ReactNode;
  mode?: "auto" | "moto" | "neutral";
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav mode={mode} />
      {/* pb-16 on phones so the call bar never covers the last part of the page */}
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <SiteFooter />
      <MobileCallBar />
    </div>
  );
}

/** Phones only: a slim bar at the bottom of every page, so a customer with a dead car can tap to call or get a quote. */
function MobileCallBar() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-border bg-background/95 p-2 backdrop-blur sm:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label="Contact Skild Auto"
    >
      <a
        href={telHref}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand-red text-sm font-bold uppercase tracking-wider text-white"
        aria-label={`Call or text ${BUSINESS.phone}`}
      >
        <Phone className="h-4 w-4" /> Call / Text
      </a>
      <Link
        to="/quote"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-bold uppercase tracking-wider"
      >
        Get a quote <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
