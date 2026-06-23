import type { ReactNode } from "react";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

export function PageLayout({ children, mode = "neutral" }: { children: ReactNode; mode?: "auto" | "moto" | "neutral" }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav mode={mode} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
