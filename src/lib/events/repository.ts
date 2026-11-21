import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import seed from "../../../data/events.seed.json";
import { getPublicSupabase } from "../supabase/server";
import { applyLocalListings, getAdminSupabase, readLocalListings, type AdminListing } from "../submissions/store";
import { isPast, todayISO } from "./format";
import { raceEventSchema, type RaceEvent } from "./types";

/** Shape of a published event as selected from Supabase (see supabase/migrations). */
type EventRow = {
  slug: string;
  name: string;
  event_date: string;
  start_time: string | null;
  region: string | null;
  city: string | null;
  venue: string | null;
  fee_summary: string | null;
  fee_kind: string;
  currency: string;
  registration_method: string;
  registration_url: string | null;
  registration_note: string | null;
  highlights: string[] | null;
  walker_friendly: boolean | null;
  verification: string;
  verified_at: string | null;
  cover_color: string;
  poster_path: string | null;
  poster_width: number | null;
  poster_height: number | null;
  poster_alt: string | null;
  description: string | null;
  status?: string;
  organisers: { name: string } | null;
  event_distances: { label: string; category: string; price_minor: number | null; note: string | null; sort: number }[];
};

function fromRow(row: EventRow): RaceEvent {
  return raceEventSchema.parse({
    slug: row.slug,
    name: row.name,
    date: row.event_date,
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    region: row.region,
    city: row.city,
    venue: row.venue,
    organiser: row.organisers?.name ?? null,
    feeSummary: row.fee_summary,
    feeKind: row.fee_kind,
    currency: row.currency,
    registration: { method: row.registration_method, url: row.registration_url, note: row.registration_note },
    highlights: row.highlights ?? [],
    walkerFriendly: row.walker_friendly,
    verification: row.verification,
    verifiedAt: row.verified_at,
    coverColor: row.cover_color,
    poster:
      row.poster_path && row.poster_width && row.poster_height
        ? { src: row.poster_path, width: row.poster_width, height: row.poster_height, alt: row.poster_alt ?? `Poster for ${row.name}` }
        : null,
    description: row.description,
    distances: [...row.event_distances]
      .sort((a, b) => a.sort - b.sort)
      .map((d) => ({ label: d.label, category: d.category, priceMinor: d.price_minor, note: d.note })),
  });
}

const SELECT = `slug, name, event_date, start_time, region, city, venue, fee_summary, fee_kind, currency,
  registration_method, registration_url, registration_note, highlights, walker_friendly, verification,
  verified_at, cover_color, poster_path, poster_width, poster_height, poster_alt, description, organisers(name), event_distances(label, category, price_minor, note, sort)`;

/**
 * Today's date, cached for an hour so pages can be prerendered and refreshed hourly.
 * Countdowns and "past race" archiving are therefore accurate to within an hour.
 */
export async function getToday(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return todayISO();
}

/** All published events, oldest first. Refreshes hourly, or instantly via revalidateTag("events") after an admin edit. */
export async function getAllEvents(): Promise<RaceEvent[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("events");
  const supabase = getPublicSupabase();
  if (!supabase) {
    // Seed races plus anything approved in the admin portal on this computer (data/local/listings.json).
    const listings = applyLocalListings(seedEvents(), await readLocalListings());
    return listings.filter((l) => l.status === "published").map((l) => l.event);
  }
  const { data, error } = await supabase
    .from("events")
    .select(SELECT)
    .eq("status", "published")
    .order("event_date", { ascending: true });
  if (error) throw new Error(`Could not load events: ${error.message}`);
  return (data as unknown as EventRow[]).map(fromRow);
}

function seedEvents(): RaceEvent[] {
  return z.array(raceEventSchema).parse(seed);
}

/** Every listing including archived ones, for the admin portal. Not cached. */
export async function getAdminListings(): Promise<AdminListing[]> {
  const db = getAdminSupabase();
  if (!db) return applyLocalListings(seedEvents(), await readLocalListings());
  const { data, error } = await db
    .from("events")
    .select(`${SELECT}, status, source_name`)
    .in("status", ["published", "archived"])
    .order("event_date", { ascending: true });
  if (error) throw new Error(`Could not load listings: ${error.message}`);
  return (data as unknown as (EventRow & { status: "published" | "archived"; source_name: string | null })[]).map((row) => ({
    event: fromRow(row),
    status: row.status,
    origin: row.source_name === "Organiser submission" ? "submission" : "database",
  }));
}

/** Slugs already in use, so a newly approved race gets a unique one. */
export async function getTakenSlugs(): Promise<string[]> {
  return (await getAdminListings()).map((l) => l.event.slug);
}

export async function getEventBySlug(slug: string): Promise<RaceEvent | null> {
  const events = await getAllEvents();
  return events.find((e) => e.slug === slug) ?? null;
}

export async function getUpcomingEvents(today: string): Promise<RaceEvent[]> {
  return (await getAllEvents()).filter((e) => !isPast(e, today));
}

// Filtering is shared with the browser (the races page filters on the device), so it lives in ./filter.
export { citiesOf, filterEvents } from "./filter";
