import { raceEventSchema, type RaceEvent } from "../events/types";
import { includedLabels, type Submission } from "./schema";

const COVER_COLORS = ["#0e3b2c", "#14503c", "#2b3a2f", "#111714", "#7a3b22"];

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** "Western City Run" on 2026-11-28 → "western-city-run-2026", made unique against `taken`. */
export function suggestSlug(name: string, date: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const year = date.slice(0, 4);
  const base = slugify(name.includes(year) ? name : `${name} ${year}`) || `race-${year}`;
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function cedis(minor: number): string {
  const v = minor / 100;
  return `GHS ${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

/**
 * Turn an approved submission into a public race listing.
 * Only what the organiser told us goes in; anything they didn't give stays null ("not listed yet").
 */
export function submissionToEvent(
  sub: Submission,
  opts: { slug: string; verification: RaceEvent["verification"]; today: string },
): RaceEvent {
  const d = sub.data;

  const distances = d.distances.map((x) => {
    const notes = [x.capacity ? `${x.capacity.toLocaleString("en-GB")} places` : null, x.cutoff ? `Cut-off ${x.cutoff}` : null].filter(Boolean);
    return {
      label: x.label,
      category: x.category,
      priceMinor: x.free ? 0 : x.fee === null ? null : Math.round(x.fee * 100),
      note: notes.length ? notes.join(" · ") : null,
    };
  });

  const prices = distances.map((x) => x.priceMinor);
  const allFree = d.distances.every((x) => x.free);
  const known = prices.filter((p): p is number => p !== null && p > 0);
  const feeKind: RaceEvent["feeKind"] = allFree ? "free" : known.length ? "paid" : "unconfirmed";
  let feeSummary: string | null = null;
  if (allFree) feeSummary = "Free";
  else if (known.length) {
    const lo = Math.min(...known);
    const hi = Math.max(...known);
    feeSummary = lo === hi ? cedis(lo) : `${cedis(lo)}–${hi / 100}`;
    if (prices.some((p) => p === 0)) feeSummary = `Free – ${cedis(hi)}`;
  }

  const r = d.registration;
  // Older submissions may not have a closing date.
  const closes = r.deadline
    ? new Date(r.deadline + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })
    : null;
  const deadline = closes ? ` Registration closes ${closes}${r.deadlineMayChange ? " (the organiser says this may change)" : ""}.` : "";
  const how: Omit<RaceEvent["registration"], "closes"> =
    r.method === "url"
      ? { method: "url", url: r.value, note: deadline.trim() || null }
      : r.method === "ussd"
        ? { method: "ussd", url: null, note: `Register by dialling ${r.value}.${deadline}` }
        : r.method === "phone"
          ? { method: "phone", url: null, note: `Register by calling or sending a WhatsApp message to ${r.value}.${deadline}` }
          : {
              method: "none",
              url: null,
              note: `Registration hasn't opened yet. Check back closer to race day.${deadline}`,
            };
  // The closing date also drives "registration closes soon" reminder emails.
  const registration: RaceEvent["registration"] = { ...how, closes: r.deadline ?? null };

  const highlights = [
    ...d.included.map((k) => includedLabels[k]),
    ...(d.includedOther ? [d.includedOther] : []),
    ...(d.requirements.minAge ? [`Minimum age ${d.requirements.minAge}`] : []),
    ...(d.requirements.notes ? [d.requirements.notes] : []),
  ];

  const hash = [...opts.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

  return raceEventSchema.parse({
    slug: opts.slug,
    name: d.race.name,
    date: d.when.date,
    startTime: d.when.startTime,
    region: d.when.region,
    city: d.when.city,
    venue: d.when.venue,
    organiser: d.organiser.organisation,
    feeSummary,
    feeKind,
    currency: "GHS",
    registration,
    highlights,
    walkerFriendly: d.requirements.walkersWelcome,
    verification: opts.verification,
    verifiedAt: opts.verification === "verified" ? opts.today : null,
    coverColor: COVER_COLORS[hash % COVER_COLORS.length],
    poster: null,
    description: d.race.description,
    distances,
  });
}
