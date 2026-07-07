import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { PageLayout } from "@/components/PageLayout";
import { Reveal } from "@/components/Reveal";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { getAvailableDays, getAvailableSlots } from "@/lib/booking.functions";
import { getQuoteId, setSlot } from "@/lib/skild-booking";
import { loadQuote } from "@/lib/quote-storage";
import { BUSINESS_TIMEZONE, parseYmd } from "@/lib/skild-timezone";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — Skild Auto" },
      { name: "description", content: "Pick a date and time for your Skild Auto service." },
    ],
  }),
  component: SchedulePage,
});

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Day-card labels are derived from a YYYY-MM-DD string the server already
// computed in the business zone, so we render that calendar date directly
// (no UTC drift across midnight).
function dateFromYmd(ymd: string): Date {
  const { y, m, d } = parseYmd(ymd);
  return new Date(y, m - 1, d);
}

function fmtMonthDay(ymd: string) {
  return dateFromYmd(ymd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtWeekday(ymd: string) {
  return dateFromYmd(ymd).toLocaleDateString("en-US", { weekday: "short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

function SchedulePage() {
  const navigate = useNavigate();
  const [quoteId, setQid] = useState<string | null>(null);
  const [days, setDays] = useState<{ date: string; hasSlots: boolean }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [err, setErr] = useState<string | null>(null);

  // Hydrate quoteId from sessionStorage (browser only).
  useEffect(() => {
    setQid(getQuoteId());
  }, []);

  // Load 21-day availability window starting at weekStart.
  useEffect(() => {
    let alive = true;
    setErr(null);
    getAvailableDays({ data: { from: weekStart.toISOString(), days: 21 } })
      .then((r) => {
        if (alive) setDays(r.days);
      })
      .catch((e) => {
        if (alive) setErr(e.message || "Could not load availability");
      });
    return () => {
      alive = false;
    };
  }, [weekStart]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let alive = true;
    setLoadingSlots(true);
    getAvailableSlots({ data: { date: selectedDate } })
      .then((r) => {
        if (alive) setSlots(r.slots);
      })
      .catch((e) => {
        if (alive) setErr(e.message || "Could not load times");
      })
      .finally(() => {
        if (alive) setLoadingSlots(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  const visibleDays = useMemo(() => days.slice(0, 14), [days]);

  const picked = (iso: string) => {
    setSlot(iso);
    navigate({ to: "/confirm" });
  };

  const quote = typeof window !== "undefined" ? loadQuote() : null;
  const hello = quote?.firstName ? `, ${quote.firstName}` : "";

  return (
    <PageLayout>
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-red">
            Schedule
          </p>
          <h1 className="mt-3 font-display text-4xl sm:text-5xl">Pick your time{hello}.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Available 60-minute slots. We'll confirm shortly after you submit.
          </p>
        </Reveal>

        {!quoteId && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
            <span className="text-muted-foreground">Haven't told us about your vehicle yet? </span>
            <Link
              to="/quote"
              className="font-bold uppercase tracking-widest text-brand-red hover:underline"
            >
              Start the quote →
            </Link>
          </div>
        )}

        {err && <p className="mt-6 text-sm text-brand-red">{err}</p>}

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Day picker */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg">
                <CalendarIcon className="h-5 w-5 text-brand-red" /> Choose a day
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const n = new Date(weekStart);
                    n.setDate(n.getDate() - 7);
                    if (n >= startOfWeek(new Date())) setWeekStart(n);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border hover:border-brand-red hover:text-brand-red disabled:opacity-30"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const n = new Date(weekStart);
                    n.setDate(n.getDate() + 7);
                    setWeekStart(n);
                  }}
                  className="grid h-8 w-8 place-items-center rounded-md border border-border hover:border-brand-red hover:text-brand-red"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-7 gap-2">
              {visibleDays.map((d) => {
                const active = selectedDate === d.date;
                return (
                  <button
                    key={d.date}
                    disabled={!d.hasSlots}
                    onClick={() => setSelectedDate(d.date)}
                    className={`flex flex-col items-center rounded-md border p-2 text-xs transition ${
                      active
                        ? "border-brand-red bg-brand-red/10 text-brand-red shadow-glow"
                        : d.hasSlots
                          ? "border-border bg-background hover:border-brand-red/60"
                          : "border-border/40 bg-background/40 text-muted-foreground/50"
                    }`}
                  >
                    <span className="font-bold uppercase tracking-widest">
                      {fmtWeekday(d.date)}
                    </span>
                    <span className="mt-1 font-display text-base">{fmtMonthDay(d.date)}</span>
                    {!d.hasSlots && (
                      <span className="mt-0.5 text-[9px] uppercase tracking-widest">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot picker */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Clock className="h-5 w-5 text-brand-red" /> Available times
            </h2>
            {!selectedDate && (
              <p className="mt-4 text-sm text-muted-foreground">Pick a day to see times.</p>
            )}
            {selectedDate && loadingSlots && (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            )}
            {selectedDate && !loadingSlots && slots.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">No slots remaining for this day.</p>
            )}
            {selectedDate && slots.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => picked(s)}
                    className="rounded-md border border-border bg-background py-2.5 text-sm font-bold uppercase tracking-wider transition hover:border-brand-red hover:bg-brand-red/10 hover:text-brand-red"
                  >
                    {fmtTime(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
