/**
 * Pure helpers for runner features (no network). Shared by the website and tests.
 */

import type { Distance, DistanceCategory, RaceEvent } from "../events/types";

/** Kilometres for a distance, from its category or a number in its label ("12 km run" → 12). */
export function distanceKm(d: Pick<Distance, "label" | "category">): number | null {
  if (d.category === "5K") return 5;
  if (d.category === "10K") return 10;
  if (d.category === "Half") return 21.1;
  if (d.category === "Marathon") return 42.2;
  const m = d.label.match(/(\d+(?:[.,]\d+)?)\s*(k|km)\b/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** "1:02:05" or "25:30" → seconds. Also accepts "1h 02m 05s". null if it doesn't look like a time. */
export function parseFinishTime(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const hms = s.match(/^(?:(\d{1,2})h)?\s*(?:(\d{1,3})m(?:in)?)?\s*(?:(\d{1,2})s)?$/);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    const total = Number(hms[1] ?? 0) * 3600 + Number(hms[2] ?? 0) * 60 + Number(hms[3] ?? 0);
    return total > 0 && total < 172800 ? total : null;
  }
  const parts = s.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
  const nums = parts.map(Number);
  const [h, m, sec] = nums.length === 3 ? nums : [0, nums[0], nums[1]];
  if (sec > 59 || (nums.length === 3 && m > 59)) return null;
  const total = h * 3600 + m * 60 + sec;
  return total > 0 && total < 172800 ? total : null;
}

/** 3725 → "1:02:05", 1530 → "25:30". */
export function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Pace per km, "5:12 /km". */
export function pacePerKm(seconds: number, km: number): string | null {
  if (!km) return null;
  const per = Math.round(seconds / km);
  return `${Math.floor(per / 60)}:${String(per % 60).padStart(2, "0")} /km`;
}

export const emailLooksValid = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

/** A runner's race, as stored in Supabase (race_entries). */
export type RaceEntry = {
  id: string;
  race_slug: string;
  race_name: string;
  race_date: string;
  region: string | null;
  distance_label: string | null;
  distance_category: DistanceCategory | null;
  distance_km: number | null;
  finish_seconds: number | null;
  note: string | null;
};

/** What to store when someone says they're running a race. */
export function entryFor(event: RaceEvent, distance: Distance) {
  return {
    race_slug: event.slug,
    race_name: event.name,
    race_date: event.date,
    region: event.region,
    distance_label: distance.label,
    distance_category: distance.category,
    distance_km: distanceKm(distance),
  };
}

export type YearInRunning = {
  year: number;
  races: number;
  finished: number;
  km: number;
  regions: string[];
  /** Best finish time per distance category (5K, 10K, Half, Marathon). */
  bests: { category: DistanceCategory; seconds: number; race: string }[];
  /** Races per month, Jan..Dec. */
  months: number[];
  longest: { race: string; km: number } | null;
  first: RaceEntry | null;
  entries: RaceEntry[];
};

/** A runner's year, from races they ran (race date in that year and on or before today). */
export function yearInRunning(all: RaceEntry[], year: number, today: string): YearInRunning {
  const entries = all
    .filter((e) => e.race_date.startsWith(`${year}-`) && e.race_date <= today)
    .sort((a, b) => a.race_date.localeCompare(b.race_date));
  const months = Array.from({ length: 12 }, () => 0);
  for (const e of entries) months[Number(e.race_date.slice(5, 7)) - 1]++;
  const bests: YearInRunning["bests"] = [];
  for (const category of ["5K", "10K", "Half", "Marathon"] as const) {
    const timed = entries.filter((e) => e.distance_category === category && e.finish_seconds);
    if (!timed.length) continue;
    const best = timed.reduce((a, b) => (b.finish_seconds! < a.finish_seconds! ? b : a));
    bests.push({ category, seconds: best.finish_seconds!, race: best.race_name });
  }
  const withKm = entries.filter((e) => e.distance_km);
  const longest = withKm.length ? withKm.reduce((a, b) => (Number(b.distance_km) > Number(a.distance_km) ? b : a)) : null;
  return {
    year,
    races: entries.length,
    finished: entries.filter((e) => e.finish_seconds).length,
    km: Math.round(withKm.reduce((sum, e) => sum + Number(e.distance_km), 0) * 10) / 10,
    regions: [...new Set(entries.map((e) => e.region).filter((r): r is string => !!r))],
    bests,
    months,
    longest: longest ? { race: longest.race_name, km: Number(longest.distance_km) } : null,
    first: entries[0] ?? null,
    entries,
  };
}

/** Average star ratings for a race's reviews. */
export type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  overall: number;
  course: number | null;
  organisation: number | null;
  water: number | null;
  medal: number | null;
  comment: string | null;
  created_at: string;
};

export const reviewAspects = [
  ["course", "Course"],
  ["organisation", "Organisation"],
  ["water", "Water stations"],
  ["medal", "Medal & kit"],
] as const;

export function reviewSummary(reviews: Review[]) {
  const avg = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => typeof x === "number");
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  return {
    count: reviews.length,
    overall: avg(reviews.map((r) => r.overall)),
    aspects: reviewAspects.map(([key, label]) => ({ key, label, value: avg(reviews.map((r) => r[key])) })),
  };
}

/** "Ama Mensah" → "Ama M." for public reviews. */
export function publicName(full: string, email: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return email.split("@")[0].slice(0, 20);
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
