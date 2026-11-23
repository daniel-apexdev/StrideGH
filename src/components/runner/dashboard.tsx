"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "@/lib/accounts/use-account";
import { countdown, formatDate } from "@/lib/events/format";
import { useToday } from "@/lib/use-today";
import { myEntries, myReminders, removeReminder, type MyReminder } from "@/lib/runner/client";
import { formatFinishTime, yearInRunning, type RaceEntry } from "@/lib/runner/core";
import { Icon } from "../icon";
import { NewRaceAlerts } from "./signups";

export type RaceLite = { slug: string; name: string; date: string };

/** Account page, signed in: your races, race history, reminders and alerts, Year in running. */
export function RunnerDashboard({ races, cities, builtOn }: { races: RaceLite[]; cities: string[]; builtOn: string }) {
  const account = useAccount();
  const today = useToday(builtOn) || builtOn;
  const [entries, setEntries] = useState<RaceEntry[] | null>(null);
  const [reminders, setReminders] = useState<MyReminder[] | null>(null);

  useEffect(() => {
    if (account.status !== "signed-in") return;
    let live = true;
    myEntries(account.supabase).then(
      (e) => live && setEntries(e),
      () => live && setEntries([]),
    );
    myReminders(account.supabase).then(
      (r) => live && setReminders(r),
      () => live && setReminders([]),
    );
    return () => {
      live = false;
    };
  }, [account]);

  if (account.status !== "signed-in") return null;
  const upcoming = (entries ?? []).filter((e) => e.race_date >= today).sort((a, b) => a.race_date.localeCompare(b.race_date));
  const history = (entries ?? []).filter((e) => e.race_date < today);
  const year = Number(today.slice(0, 4));
  const thisYear = yearInRunning(entries ?? [], year, today);
  const byslug = new Map(races.map((r) => [r.slug, r]));
  const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6";
  const h2 = "font-display text-3xl font-extrabold uppercase leading-none";

  return (
    <>
      <section className={`${card} md:col-span-2`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={h2}>Your races</h2>
          <Link href="/events" className="text-sm font-semibold text-link">
            Find a race →
          </Link>
        </div>
        {entries === null ? (
          <div className="h-20 animate-pulse rounded-xl bg-tile" />
        ) : upcoming.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.race_slug}`} className="flex items-center gap-3 rounded-xl bg-soft p-3 hover:bg-tile">
                  <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-hero leading-none text-on-hero">
                    <span className="text-[10px] font-bold">{formatDate.month(e.race_date)}</span>
                    <span className="font-display text-2xl font-extrabold">{formatDate.day(e.race_date)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{e.race_name}</span>
                    <span className="block text-sm text-text2">
                      {e.distance_label} · {countdown(e.race_date, today)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text2">
            No races yet. Open a race and tap <strong>I&apos;m running this</strong> to get reminders and keep your history here.
          </p>
        )}
      </section>

      <section className={`${card} md:col-span-2`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className={h2}>Race history</h2>
          {thisYear.races > 0 && (
            <Link href="/year" className="flex items-center gap-1.5 text-sm font-semibold text-link">
              Your {year} in running <Icon name="arrow" size={16} />
            </Link>
          )}
        </div>
        {entries === null ? (
          <div className="h-20 animate-pulse rounded-xl bg-tile" />
        ) : history.length ? (
          <>
            {thisYear.bests.length > 0 && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {thisYear.bests.map((b) => (
                  <div key={b.category} className="rounded-xl bg-soft p-3">
                    <dt className="text-xs font-bold tracking-[0.08em] text-text2">BEST {b.category === "Half" ? "HALF" : b.category.toUpperCase()}</dt>
                    <dd className="font-display text-3xl font-extrabold">{formatFinishTime(b.seconds)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <ul className="divide-y divide-line2">
              {history.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/events/${e.race_slug}`} className="min-w-0">
                    <span className="block truncate font-semibold hover:underline">{e.race_name}</span>
                    <span className="block text-sm text-text2">
                      {formatDate.short(e.race_date)} {e.race_date.slice(0, 4)} · {e.distance_label}
                    </span>
                  </Link>
                  {e.finish_seconds ? (
                    <span className="font-display text-2xl font-extrabold">{formatFinishTime(e.finish_seconds)}</span>
                  ) : (
                    <Link href={`/events/${e.race_slug}`} className="shrink-0 text-sm font-semibold text-link">
                      Add time
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-text2">After a race, open its page and log your time. It all adds up here and in your Year in running.</p>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>Race reminders</h2>
        {reminders === null ? (
          <div className="h-16 animate-pulse rounded-xl bg-tile" />
        ) : reminders.length ? (
          <ul className="divide-y divide-line2">
            {reminders.map((r) => {
              const race = byslug.get(r.race_slug);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/events/${r.race_slug}`} className="min-w-0 truncate font-semibold hover:underline">
                    {race?.name ?? r.race_slug}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      await removeReminder(account.supabase, r.race_slug).catch(() => {});
                      setReminders((list) => (list ?? []).filter((x) => x.id !== r.id));
                    }}
                    className="shrink-0 text-sm font-semibold underline"
                  >
                    Stop
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text2">Tap &ldquo;Remind me&rdquo; on any race to get emails before registration closes and before race day.</p>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>New-race alerts</h2>
        <NewRaceAlerts cities={cities} />
      </section>
    </>
  );
}
