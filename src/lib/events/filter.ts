import { daysUntil, isArchived, isPast } from "./format";
import { distanceCategories, feeKinds, type EventFilters, type RaceEvent } from "./types";

/** Race filtering, used on the server and in the browser (so it also works on a static host like GitHub Pages). */

export function filterEvents(events: RaceEvent[], f: EventFilters, today: string): RaceEvent[] {
  const q = f.q?.trim().toLowerCase();
  const out = events.filter((e) => {
    const past = isPast(e, today);
    if ((f.when ?? "upcoming") === "upcoming" && past) return false;
    if (f.when === "30days" && (past || daysUntil(e.date, today) > 30)) return false;
    if (f.when === "past" && (!past || isArchived(e, today))) return false;
    if (f.distance && !e.distances.some((d) => d.category === f.distance)) return false;
    if (f.city && (f.city === "unlisted" ? e.city !== null : e.city !== f.city)) return false;
    if (f.fee && e.feeKind !== f.fee) return false;
    if (q) {
      const hay = [e.name, e.city, e.venue, e.organiser, e.region].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return f.when === "past" ? out.reverse() : out;
}

/** Cities that appear on upcoming listings, for the location filter. */
export function citiesOf(events: RaceEvent[]): string[] {
  return [...new Set(events.map((e) => e.city).filter((c): c is string => !!c))].sort();
}

export type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseFilters(sp: Params): EventFilters {
  const distance = one(sp.distance);
  const when = one(sp.when);
  const fee = one(sp.fee);
  return {
    q: one(sp.q),
    distance: distanceCategories.find((d) => d === distance),
    when: when === "30days" || when === "past" ? when : "upcoming",
    city: one(sp.city),
    fee: feeKinds.find((f) => f === fee),
  };
}

export function hrefWith(f: EventFilters, change: Partial<EventFilters>): string {
  const next = { ...f, ...change };
  const p = new URLSearchParams();
  if (next.q) p.set("q", next.q);
  if (next.distance) p.set("distance", next.distance);
  if (next.when && next.when !== "upcoming") p.set("when", next.when);
  if (next.city) p.set("city", next.city);
  if (next.fee) p.set("fee", next.fee);
  const s = p.toString();
  return s ? `/events?${s}` : "/events";
}

