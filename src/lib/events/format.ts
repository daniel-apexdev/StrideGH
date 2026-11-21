import type { Distance, RaceEvent } from "./types";

const MS_PER_DAY = 86_400_000;

/** Today's date in Ghana (GMT) as YYYY-MM-DD. Server pages get it from getToday() so it can be cached. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function asUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function daysUntil(iso: string, today: string): number {
  return Math.round((asUTC(iso).getTime() - asUTC(today).getTime()) / MS_PER_DAY);
}

export function isPast(event: Pick<RaceEvent, "date">, today: string): boolean {
  return daysUntil(event.date, today) < 0;
}

const fmt = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(asUTC(iso));

export const formatDate = {
  short: (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" }),
  long: (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "long", year: "numeric" }),
  day: (iso: string) => fmt(iso, { day: "2-digit" }),
  month: (iso: string) => fmt(iso, { month: "short" }).slice(0, 3).toUpperCase(),
  weekday: (iso: string) => fmt(iso, { weekday: "short" }).toUpperCase(),
  monthName: (iso: string) => fmt(iso, { month: "long" }),
};

export function countdown(iso: string, today: string): string {
  const n = daysUntil(iso, today);
  if (n < 0) return "Took place";
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

export function formatStartTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatPrice(minor: number | null, currency: string): string | null {
  if (minor === null) return null;
  if (minor === 0) return "Free";
  const major = minor / 100;
  return `${currency} ${major.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function feeLabel(event: RaceEvent): string {
  if (event.feeSummary) return event.feeSummary;
  return event.feeKind === "free" ? "Free" : "Fee unconfirmed";
}

const categoryLabel = { "5K": "5K", "10K": "10K", Half: "21.1K", Marathon: "42.2K" } as const;

/** Short summary for cards, e.g. "5K · 10K". Packages like "Race + transport" are left out. */
export function distanceSummary(distances: Distance[]): string {
  const labels = distances
    .filter((d) => !d.label.includes("+"))
    .map((d) => (d.category === "Other" ? d.label : categoryLabel[d.category]));
  return [...new Set(labels)].join(" · ");
}

export function locationLabel(event: RaceEvent): string {
  const parts = [event.venue, event.city].filter(Boolean);
  return parts.length ? parts.join(", ") : "Venue not listed yet";
}

/** The big number used on covers: the longest standard distance. */
export function coverNumeral(event: RaceEvent): string {
  const order = ["Marathon", "Half", "10K", "5K", "Other"] as const;
  const map = { Marathon: "42K", Half: "21K", "10K": "10K", "5K": "5K", Other: "" } as const;
  for (const cat of order) {
    if (event.distances.some((d) => d.category === cat)) {
      if (cat !== "Other") return map[cat];
      const km = event.distances[0].label.match(/(\d+)\s*km/i);
      return km ? `${km[1]}K` : "RUN";
    }
  }
  return "RUN";
}

export function googleCalendarUrl(event: RaceEvent): string {
  const start = event.date.replaceAll("-", "");
  const next = new Date(asUTC(event.date).getTime() + MS_PER_DAY).toISOString().slice(0, 10).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.name,
    dates: `${start}/${next}`,
    details: "Found on Stride GH. Confirm details with the organiser before race day.",
    location: locationLabel(event),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function whatsappShareUrl(event: RaceEvent, pageUrl?: string): string {
  const text = `${event.name} — ${formatDate.short(event.date)}${pageUrl ? `\n${pageUrl}` : ""}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mapsUrl(event: RaceEvent): string | null {
  if (!event.venue && !event.city) return null;
  const q = [event.venue, event.city, "Ghana"].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
