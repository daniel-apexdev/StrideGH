/**
 * Race types and helpers. These mirror the website's src/lib/events/types.ts and format.ts —
 * if you change the API shape there, change it here too.
 */

export type DistanceCategory = '5K' | '10K' | 'Half' | 'Marathon' | 'Other';
export type FeeKind = 'free' | 'paid' | 'unconfirmed';
export type Verification = 'unverified' | 'verified' | 'details_tbc';

export type Distance = {
  label: string;
  category: DistanceCategory;
  /** Price in minor units (pesewas / cents). null = not published. */
  priceMinor: number | null;
  note: string | null;
};

/** Organiser poster. `src` is a path on the website ("/posters/...") or a full https URL. */
export type Poster = { src: string; width: number; height: number; alt: string };

export type RaceEvent = {
  slug: string;
  name: string;
  date: string; // YYYY-MM-DD, Ghana time
  startTime: string | null; // HH:MM
  region: string | null;
  city: string | null;
  venue: string | null;
  organiser: string | null;
  feeSummary: string | null;
  feeKind: FeeKind;
  currency: string;
  registration: { method: 'url' | 'phone' | 'ussd' | 'none'; url: string | null; note: string | null };
  highlights: string[];
  walkerFriendly: boolean | null;
  verification: Verification;
  verifiedAt: string | null;
  coverColor: string;
  /** Missing in older data, so treat undefined like null. */
  poster?: Poster | null;
  /** More images from the organiser (medal, route, second flyer). */
  gallery?: Poster[];
  /** The organiser's own description (races listed through the app or website). */
  description?: string | null;
  distances: Distance[];
};

export type EventFilters = {
  q?: string;
  distance?: DistanceCategory;
  when?: 'upcoming' | '30days' | 'past';
  city?: string; // a city name, or 'unlisted'
  fee?: FeeKind;
};

export const distanceCategories: DistanceCategory[] = ['5K', '10K', 'Half', 'Marathon', 'Other'];

const MS_PER_DAY = 86_400_000;

/** Today's date in Ghana (GMT all year) as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
const asUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function daysUntil(iso: string, today: string): number {
  return Math.round((asUTC(iso).getTime() - asUTC(today).getTime()) / MS_PER_DAY);
}

export const isPast = (e: Pick<RaceEvent, 'date'>, today: string) => daysUntil(e.date, today) < 0;

/*
 * A race's life (same rules as the website's src/lib/events/format.ts):
 *   upcoming → this week → race day → past → archived
 * Past races leave the main lists the day after, get a "Race over" look, and stay under
 * "Past races" for PAST_RACE_DAYS. After that they're archived: not listed, but the page
 * still opens and links to next year's edition.
 */
export const PAST_RACE_DAYS = 365;

export type RaceStatus = 'upcoming' | 'this-week' | 'today' | 'past';

export function raceStatus(e: Pick<RaceEvent, 'date'>, today: string): RaceStatus {
  const n = daysUntil(e.date, today);
  if (n < 0) return 'past';
  if (n === 0) return 'today';
  return n <= 7 ? 'this-week' : 'upcoming';
}

export const isArchived = (e: Pick<RaceEvent, 'date'>, today: string) => daysUntil(e.date, today) < -PAST_RACE_DAYS;

/** "final-lap-2026" and "final-lap-2027" are the same race in different years. */
export const seriesKey = (slug: string) => slug.replace(/-(19|20)\d{2}$/, '');

/** The same race in a later year, if it's listed. */
export function nextEdition(event: RaceEvent, all: RaceEvent[]): RaceEvent | null {
  const key = seriesKey(event.slug);
  return all.filter((e) => e.slug !== event.slug && seriesKey(e.slug) === key && e.date > event.date).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Hermes' Intl support varies, so dates are formatted by hand. */
export const formatDate = {
  day: (iso: string) => iso.slice(8, 10),
  month: (iso: string) => MONTHS[asUTC(iso).getUTCMonth()],
  monthName: (iso: string) => MONTH_NAMES[asUTC(iso).getUTCMonth()],
  weekday: (iso: string) => DAYS[asUTC(iso).getUTCDay()].toUpperCase(),
  short: (iso: string) => {
    const d = asUTC(iso);
    return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()].slice(0, 3)}`;
  },
  long: (iso: string) => {
    const d = asUTC(iso);
    return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  },
};

export function countdown(iso: string, today: string): string {
  const n = daysUntil(iso, today);
  if (n < 0) return 'Took place';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return `In ${n} days`;
}

export function formatStartTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatPrice(minor: number | null, currency: string): string | null {
  if (minor === null) return null;
  if (minor === 0) return 'Free';
  const major = minor / 100;
  const text = Number.isInteger(major) ? String(major) : major.toFixed(2);
  return `${currency} ${text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function feeLabel(e: RaceEvent): string {
  if (e.feeSummary) return e.feeSummary;
  return e.feeKind === 'free' ? 'Free' : 'Fee unconfirmed';
}

const categoryLabel = { '5K': '5K', '10K': '10K', Half: '21.1K', Marathon: '42.2K' } as const;

/** Short summary for cards, e.g. "5K · 10K". Packages like "Race + transport" are left out. */
export function distanceSummary(distances: Distance[]): string {
  const labels = distances.filter((d) => !d.label.includes('+')).map((d) => (d.category === 'Other' ? d.label : categoryLabel[d.category]));
  return [...new Set(labels)].join(' · ');
}

export function locationLabel(e: RaceEvent): string {
  const parts = [e.venue, e.city].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Venue not listed yet';
}

/** The big number used on covers: the longest standard distance. */
export function coverNumeral(e: RaceEvent): string {
  if (e.distances.some((d) => d.category === 'Marathon')) return '42K';
  if (e.distances.some((d) => d.category === 'Half')) return '21K';
  if (e.distances.some((d) => d.category === '10K')) return '10K';
  if (e.distances.some((d) => d.category === '5K')) return '5K';
  const km = e.distances[0]?.label.match(/(\d+)\s*km/i);
  return km ? `${km[1]}K` : 'RUN';
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^https?:\/\/([^/?#]+)/i);
  return m ? m[1].replace(/^www\./, '') : null;
}

export function mapsUrl(e: RaceEvent): string | null {
  if (!e.venue && !e.city) return null;
  const q = [e.venue, e.city, 'Ghana'].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function googleCalendarUrl(e: RaceEvent): string {
  const start = e.date.replaceAll('-', '');
  const next = new Date(asUTC(e.date).getTime() + MS_PER_DAY).toISOString().slice(0, 10).replaceAll('-', '');
  const q = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(e.name)}`,
    `dates=${start}/${next}`,
    `details=${encodeURIComponent('Found on Stride GH. Confirm details with the organiser before race day.')}`,
    `location=${encodeURIComponent(locationLabel(e))}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function filterEvents(events: RaceEvent[], f: EventFilters, today: string): RaceEvent[] {
  const q = f.q?.trim().toLowerCase();
  const when = f.when ?? 'upcoming';
  const out = events.filter((e) => {
    const past = isPast(e, today);
    if (when === 'upcoming' && past) return false;
    if (when === '30days' && (past || daysUntil(e.date, today) > 30)) return false;
    if (when === 'past' && (!past || isArchived(e, today))) return false;
    if (f.distance && !e.distances.some((d) => d.category === f.distance)) return false;
    if (f.city && (f.city === 'unlisted' ? e.city !== null : e.city !== f.city)) return false;
    if (f.fee && e.feeKind !== f.fee) return false;
    if (q) {
      const hay = [e.name, e.city, e.venue, e.organiser, e.region].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  return when === 'past' ? out.reverse() : out;
}

export function citiesOf(events: RaceEvent[]): string[] {
  return [...new Set(events.map((e) => e.city).filter((c): c is string => !!c))].sort();
}
