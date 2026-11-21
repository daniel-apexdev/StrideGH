"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useSavedEvents } from "@/lib/saved";
import type { RaceEvent } from "@/lib/events/types";
import { countdown, distanceSummary, feeLabel, formatDate, hostOf, isPast, todayISO } from "@/lib/events/format";
import { Icon } from "../icon";

const noop = () => () => {};

function note(e: RaceEvent, today: string): { text: string; cls: string } {
  if (isPast(e, today)) return { text: `Raced on ${formatDate.short(e.date)}`, cls: "bg-neu-bg text-neu-fg" };
  if (e.verification === "details_tbc") return { text: "Details still to be confirmed — we'll update this", cls: "bg-warn-bg text-warn-fg" };
  if (e.registration.method === "url" && e.registration.url) return { text: `Register on ${hostOf(e.registration.url)}`, cls: "bg-neu-bg text-neu-fg" };
  return { text: "See how to register", cls: "bg-neu-bg text-neu-fg" };
}

export function SavedList({ events }: { events: RaceEvent[] }) {
  const { saved, toggle, remove } = useSavedEvents();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const list = events.filter((e) => saved.includes(e.slug));

  if (!mounted) return <div className="h-40" aria-busy="true" />;

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2.5 px-4 py-14 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-tile text-icon">
          <Icon name="calendar" size={30} strokeWidth={1.8} />
        </span>
        <h2 className="font-display text-[26px] font-extrabold uppercase">No saved races yet</h2>
        <p className="text-sm leading-snug text-text2">Tap Save on any race and we&apos;ll keep it here with its countdown.</p>
        <Link href="/events" className="mt-1.5 flex h-12 items-center rounded-xl bg-primary px-5 text-[15px] font-bold text-on-primary">
          Find a race
        </Link>
      </div>
    );
  }

  const today = todayISO();
  const upcoming = list.filter((e) => !isPast(e, today)).sort((a, b) => a.date.localeCompare(b.date));
  const past = list.filter((e) => isPast(e, today)).sort((a, b) => b.date.localeCompare(a.date));
  const card = (e: RaceEvent) => {
    const n = note(e, today);
    const over = isPast(e, today);
    return (
          <li key={e.slug} className={`flex flex-col overflow-hidden rounded-2xl border border-line ${over ? "bg-soft" : "bg-surface"}`}>
            <div className="flex flex-1 gap-3 p-4">
              <Link href={`/events/${e.slug}`} className="flex min-w-0 flex-1 gap-3">
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[10px] leading-none text-[#f4f2ec] ${over ? "grayscale brightness-75" : ""}`}
                  style={{ background: e.coverColor }}
                >
                  <span className="font-display text-[26px] font-extrabold">{formatDate.day(e.date)}</span>
                  <span className="text-[10px] font-bold text-volt">{formatDate.month(e.date)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-[3px]">
                  <span className={`font-display text-xl font-bold leading-[1.05] ${over ? "text-text2" : ""}`}>{e.name}</span>
                  <span className="text-xs text-text2">
                    {distanceSummary(e.distances)} · {feeLabel(e)}
                  </span>
                  <span className={`text-xs font-bold ${over ? "uppercase tracking-[0.06em] text-text2" : "text-link"}`}>{over ? "Race over" : countdown(e.date, today)}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => toggle(e.slug)}
                aria-label={`Remove ${e.name} from saved`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-volt text-night"
              >
                <Icon name="bookmark" size={18} fill="currentColor" />
              </button>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold ${n.cls}`}>
              <Icon name="clock" size={14} strokeWidth={2.2} />
              {n.text}
            </div>
          </li>
    );
  };

  return (
    <div className="flex flex-col gap-12">
      {upcoming.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map(card)}</ul>
      ) : (
        <p className="rounded-2xl border border-line bg-surface p-6 text-body">
          None of your saved races are coming up.{" "}
          <Link href="/events" className="font-semibold text-link">
            Find your next race
          </Link>
        </p>
      )}
      {past.length > 0 && (
        <section aria-labelledby="saved-past" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="saved-past" className="font-display text-3xl font-extrabold uppercase leading-none">
                Past races
              </h2>
              <p className="mt-1 text-sm text-text2">Races you saved that have already happened.</p>
            </div>
            <button
              type="button"
              onClick={() => remove(past.map((e) => e.slug))}
              className="flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold hover:bg-tile"
            >
              Clear past races
            </button>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
