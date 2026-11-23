"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import { myEntries } from "@/lib/runner/client";
import { formatFinishTime, yearInRunning, type RaceEntry, type YearInRunning } from "@/lib/runner/core";
import { useToday } from "@/lib/use-today";
import { Icon } from "../icon";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const HERO = "#0e3b2c";
const VOLT = "#c6f24e";
const PAPER = "#f4f2ec";
const bestLabel = (c: string) => (c === "Half" ? "Half marathon" : c === "Marathon" ? "Marathon" : c);

/** /year: a runner's year on Stride GH, as a card they can download and share. */
export function YearInRunningLive({ builtOn }: { builtOn: string }) {
  const account = useAccount();
  const today = useToday(builtOn) || builtOn;
  const [entries, setEntries] = useState<RaceEntry[] | null>(null);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(thisYear);

  useEffect(() => {
    if (account.status !== "signed-in") return;
    let live = true;
    myEntries(account.supabase).then(
      (e) => live && setEntries(e),
      () => live && setEntries([]),
    );
    return () => {
      live = false;
    };
  }, [account]);

  const years = useMemo(() => {
    const ys = new Set((entries ?? []).map((e) => Number(e.race_date.slice(0, 4))).filter((y) => y <= thisYear));
    ys.add(thisYear);
    return [...ys].sort((a, b) => b - a);
  }, [entries, thisYear]);

  if (account.status === "loading") return <div className="h-96 animate-pulse rounded-3xl bg-tile" />;
  if (account.status === "off")
    return <p className="rounded-2xl border border-line bg-surface p-6 text-body">Year in running is coming soon.</p>;
  if (account.status === "signed-out") return <Intro />;
  if (entries === null) return <div className="h-96 animate-pulse rounded-3xl bg-tile" />;

  const y = yearInRunning(entries, year, today);
  const name = profileOf(account.user).name.split(" ")[0] || "Runner";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr] lg:items-start">
      <YearCard y={y} name={name} inProgress={year === thisYear && today.slice(5) < "12-31"} />
      <div className="flex flex-col gap-5">
        {years.length > 1 && (
          <div role="tablist" aria-label="Year" className="flex flex-wrap gap-2">
            {years.map((yy) => (
              <button
                key={yy}
                type="button"
                role="tab"
                aria-selected={yy === year}
                onClick={() => setYear(yy)}
                className={`h-10 rounded-full border px-4 text-sm font-bold ${yy === year ? "border-sel bg-sel text-on-sel" : "border-line bg-surface hover:bg-tile"}`}
              >
                {yy}
              </button>
            ))}
          </div>
        )}
        {y.races === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-3xl font-extrabold uppercase">Nothing here yet</h2>
            <p className="mt-2 text-body">
              Your Year in running fills up as you race. Tap <strong>I&apos;m running this</strong> on a race, then log your time afterwards.
            </p>
            <Link href="/events" className="mt-4 inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-on-primary">
              Find a race
            </Link>
          </div>
        ) : (
          <>
            <ShareButtons y={y} name={name} />
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-display text-2xl font-extrabold uppercase">Your {y.year} races</h2>
              <ul className="mt-3 divide-y divide-line2">
                {y.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/events/${e.race_slug}`} className="min-w-0">
                      <span className="block truncate font-semibold hover:underline">{e.race_name}</span>
                      <span className="text-sm text-text2">{e.distance_label}</span>
                    </Link>
                    <span className="font-display text-xl font-extrabold">{e.finish_seconds ? formatFinishTime(e.finish_seconds) : "—"}</span>
                  </li>
                ))}
              </ul>
              {y.finished < y.races && (
                <p className="mt-3 text-sm text-text2">Add the missing times on each race&apos;s page to see your best times here.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr] lg:items-center">
      <YearCard y={sample} name="Ama" inProgress={false} example />
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95]">Every race you run, in one card</h2>
        <p className="text-lg text-body">
          Tell us which races you&apos;re running and log your times. Stride GH adds them up: races, kilometres, best times and the
          places you raced. Share it when the year&apos;s done.
        </p>
        <Link href="/account?next=%2Fyear" className="inline-flex h-12 items-center self-start rounded-xl bg-primary px-5 font-bold text-on-primary">
          Sign in or create an account
        </Link>
        <p className="text-sm text-text2">Free, with an email code. No password.</p>
      </div>
    </div>
  );
}

const sample: YearInRunning = {
  year: 2026,
  races: 5,
  finished: 5,
  km: 79.3,
  regions: ["Greater Accra", "Western", "Central"],
  bests: [
    { category: "5K", seconds: 1612, race: "Gold Coast Run" },
    { category: "10K", seconds: 3305, race: "Western City Run" },
    { category: "Half", seconds: 7490, race: "Accra Half" },
  ],
  months: [0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1],
  longest: { race: "Accra Half", km: 21.1 },
  first: null,
  entries: [],
};

function YearCard({ y, name, inProgress, example }: { y: YearInRunning; name: string; inProgress: boolean; example?: boolean }) {
  const max = Math.max(1, ...y.months);
  return (
    <figure className="relative overflow-hidden rounded-3xl p-7 text-[#f4f2ec] shadow-[0_24px_50px_rgba(0,0,0,0.25)] md:p-9" style={{ background: HERO }}>
      {example && (
        <span className="absolute right-5 top-5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-[0.1em]">EXAMPLE</span>
      )}
      <figcaption className="text-xs font-bold tracking-[0.18em]" style={{ color: VOLT }}>
        STRIDE GH · YEAR IN RUNNING{inProgress ? " · SO FAR" : ""}
      </figcaption>
      <p className="mt-2 font-display text-6xl font-extrabold uppercase leading-[0.9] md:text-7xl">
        {name}&apos;s
        <br />
        <span style={{ color: VOLT }}>{y.year}</span>
      </p>
      <dl className="mt-7 grid grid-cols-3 gap-4">
        {[
          [String(y.races), y.races === 1 ? "race" : "races"],
          [y.km % 1 ? y.km.toFixed(1) : String(y.km), "km raced"],
          [String(y.regions.length), y.regions.length === 1 ? "region" : "regions"],
        ].map(([n, l]) => (
          <div key={l}>
            <dt className="sr-only">{l}</dt>
            <dd className="font-display text-5xl font-extrabold leading-none" style={{ color: VOLT }}>
              {n}
            </dd>
            <dd className="mt-1 text-sm text-white/70">{l}</dd>
          </div>
        ))}
      </dl>
      {y.bests.length > 0 && (
        <div className="mt-7 flex flex-col gap-2 border-t border-white/15 pt-5">
          <span className="text-xs font-bold tracking-[0.14em] text-white/60">BEST TIMES</span>
          {y.bests.map((b) => (
            <div key={b.category} className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">{bestLabel(b.category)}</span>
              <span className="font-display text-3xl font-extrabold">{formatFinishTime(b.seconds)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-7 border-t border-white/15 pt-5">
        <span className="text-xs font-bold tracking-[0.14em] text-white/60">RACES BY MONTH</span>
        <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden>
          {y.months.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-sm" style={{ height: `${n ? 12 + (n / max) * 36 : 3}px`, background: n ? VOLT : "rgba(255,255,255,0.15)" }} />
              <span className="text-[10px] text-white/50">{MONTHS[i]}</span>
            </div>
          ))}
        </div>
      </div>
      {y.regions.length > 0 && <p className="mt-5 text-sm text-white/70">Raced in {y.regions.join(" · ")}</p>}
    </figure>
  );
}

/** Draws the card as a 1080 × 1350 image (Instagram portrait) for download or sharing. */
async function cardImage(y: YearInRunning, name: string): Promise<Blob> {
  await document.fonts.ready;
  const display = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "Arial Narrow, sans-serif";
  const body = getComputedStyle(document.body).fontFamily || "sans-serif";
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const g = c.getContext("2d")!;
  g.fillStyle = HERO;
  g.fillRect(0, 0, 1080, 1350);
  // Big outline year in the background.
  g.save();
  g.globalAlpha = 0.12;
  g.strokeStyle = VOLT;
  g.lineWidth = 4;
  g.font = `800 400px ${display}`;
  g.strokeText(String(y.year).slice(2), 640, 470);
  g.restore();

  g.fillStyle = VOLT;
  g.font = `700 30px ${body}`;
  g.fillText("STRIDE GH · YEAR IN RUNNING", 90, 140);
  g.fillStyle = PAPER;
  g.font = `800 150px ${display}`;
  g.fillText(`${name.toUpperCase()}'S`, 90, 300);
  g.fillStyle = VOLT;
  g.fillText(String(y.year), 90, 440);

  const stats: [string, string][] = [
    [String(y.races), y.races === 1 ? "race" : "races"],
    [y.km % 1 ? y.km.toFixed(1) : String(y.km), "km raced"],
    [String(y.regions.length), y.regions.length === 1 ? "region" : "regions"],
  ];
  stats.forEach(([n, l], i) => {
    const x = 90 + i * 310;
    g.fillStyle = VOLT;
    g.font = `800 130px ${display}`;
    g.fillText(n, x, 640);
    g.fillStyle = "rgba(244,242,236,0.7)";
    g.font = `500 34px ${body}`;
    g.fillText(l, x, 690);
  });

  let top = 780;
  if (y.bests.length) {
    g.fillStyle = "rgba(244,242,236,0.15)";
    g.fillRect(90, top - 40, 900, 2);
    g.fillStyle = "rgba(244,242,236,0.6)";
    g.font = `700 26px ${body}`;
    g.fillText("BEST TIMES", 90, top);
    for (const b of y.bests.slice(0, 4)) {
      top += 70;
      g.fillStyle = PAPER;
      g.font = `600 38px ${body}`;
      g.fillText(bestLabel(b.category), 90, top);
      g.font = `800 64px ${display}`;
      const t = formatFinishTime(b.seconds);
      g.fillText(t, 990 - g.measureText(t).width, top);
    }
    top += 60;
  }

  // Months strip.
  const max = Math.max(1, ...y.months);
  const base = Math.max(top + 160, 1180);
  y.months.forEach((n, i) => {
    const x = 90 + i * 76;
    const h = n ? 30 + (n / max) * 110 : 8;
    g.fillStyle = n ? VOLT : "rgba(244,242,236,0.15)";
    g.fillRect(x, base - h, 58, h);
    g.fillStyle = "rgba(244,242,236,0.5)";
    g.font = `600 22px ${body}`;
    g.fillText(MONTHS[i], x + 22, base + 34);
  });
  g.fillStyle = "rgba(244,242,236,0.55)";
  g.font = `500 26px ${body}`;
  g.fillText("stridegh · races & running gear across Ghana", 90, 1300);

  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("canvas"))), "image/png"));
}

function ShareButtons({ y, name }: { y: YearInRunning; name: string }) {
  const [busy, setBusy] = useState(false);
  const file = `stride-gh-${y.year}-in-running.png`;

  async function download() {
    setBusy(true);
    try {
      const blob = await cardImage(y, name);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await cardImage(y, name);
      const f = new File([blob], file, { type: "image/png" });
      const text = `My ${y.year} in running: ${y.races} ${y.races === 1 ? "race" : "races"}, ${y.km} km. Find your next race on Stride GH.`;
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else await download();
    } catch {
      // Closing the share sheet isn't an error.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={share} disabled={busy} className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-bold text-on-primary disabled:opacity-60">
        <Icon name="share" size={18} /> Share my year
      </button>
      <button type="button" onClick={download} disabled={busy} className="flex h-12 items-center gap-2 rounded-xl border border-line bg-surface px-5 font-bold hover:bg-tile disabled:opacity-60">
        Download image
      </button>
    </div>
  );
}
