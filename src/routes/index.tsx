import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Car, ArrowRight } from "lucide-react";
import mainBg from "@/assets/main-bg.jpg";
import skildLogo from "@/assets/skild-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skild Auto — Built for the road. Ready for anything." },
      { name: "description", content: "Choose your experience: mobile automotive repair or motorcycle service. Skild Auto, Salt Lake City." },
      { property: "og:title", content: "Skild Auto" },
      { property: "og:description", content: "Mobile auto and moto service brought to you in Salt Lake City." },
      { property: "og:url", content: "https://www.skildauto.com/" },
    ],
    links: [{ rel: "canonical", href: "https://www.skildauto.com/" }],
  }),
  component: Splash,
});

function Splash() {
  const [revealed, setRevealed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative overflow-hidden bg-background" style={{ height: "100svh" }}>
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={mainBg} alt="" className="h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-vignette)" }} />
        <div className="absolute inset-0 scanlines opacity-40" />
      </div>

      {/* Ember particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="animate-ember absolute block h-1.5 w-1.5 rounded-full bg-brand-red"
            style={{
              left: `${(i * 53) % 100}%`,
              bottom: "-20px",
              boxShadow: "0 0 12px 2px rgba(220,30,40,0.7)",
              animationDelay: `${(i % 6) * 0.9}s`,
              animationDuration: `${6 + (i % 4)}s`,
            }}
          />
        ))}
      </div>

      {/* Red light streaks */}
      <div className="pointer-events-none absolute left-[10%] top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-60 animate-flicker" />
      <div className="pointer-events-none absolute right-[10%] top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-brand-red to-transparent opacity-60 animate-flicker" style={{ animationDelay: "1s" }} />

      <div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-4 py-3 text-center sm:gap-5 sm:px-6 sm:py-6"
        style={{ minHeight: "100svh", height: "100svh" }}
      >
        <div
          className={`flex flex-col items-center transition-all duration-1000 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h1 className="sr-only">Skild Auto — Mobile Auto &amp; Motorcycle Repair in Salt Lake City, Utah</h1>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-brand-red sm:text-xs">Skild Auto Repair</p>
          <img
            src={skildLogo}
            alt="Skild Auto"
            className="mx-auto mt-2 w-auto sm:mt-4"
            style={{ height: "clamp(5.5rem, 26vh, 22rem)" }}
          />
          <p className="mx-auto mt-2 max-w-xl text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground sm:mt-4 sm:text-sm">
            Helping you get back on the road with honest service and reliable solutions.
          </p>
        </div>

        <div
          className={`grid w-full max-w-3xl gap-3 transition-all delay-500 duration-1000 sm:gap-4 sm:grid-cols-2 ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <ModeCard
            label="Auto"
            sub="Mobile automotive repair"
            icon={<Car className="h-6 w-6 sm:h-7 sm:w-7" />}
            onClick={() => navigate({ to: "/auto" })}
            primary
          />
          <ModeCard
            label="Moto"
            sub="Motorcycle service & performance"
            icon={<Bike className="h-6 w-6 sm:h-7 sm:w-7" />}
            onClick={() => navigate({ to: "/moto" })}
          />
        </div>

        <Link
          to="/services"
          className={`text-[10px] uppercase tracking-[0.3em] text-muted-foreground transition hover:text-brand-red sm:text-xs ${revealed ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDelay: "1000ms" }}
        >
          Skip intro · Explore services →
        </Link>
      </div>
    </div>
  );
}

function ModeCard({
  label, sub, icon, onClick, primary,
}: { label: string; sub: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`shine-border group relative overflow-hidden rounded-xl border border-border bg-card/80 p-5 text-left backdrop-blur transition-all hover:-translate-y-1 hover:border-brand-red sm:p-8 ${primary ? "shadow-glow" : ""}`}
    >
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-red/10 text-brand-red transition-all group-hover:bg-brand-red group-hover:text-white sm:h-14 sm:w-14">
          {icon}
        </span>
        <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-red" />
      </div>
      <div className="mt-4 font-display text-2xl sm:mt-6 sm:text-4xl">{label}</div>
      <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground sm:text-sm">{sub}</div>
    </button>
  );
}
