import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readJson, serial, writeJson } from "../local-files";
import { raceEventSchema, type RaceEvent } from "../events/types";
import { newReference, type Submission, type SubmissionInput, type SubmissionStatus } from "./schema";

/**
 * Where submissions and admin changes are kept.
 *
 * - Supabase (when NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set): the `submissions`
 *   table, and approved races go straight into `events`. Use this for anything deployed.
 * - Local files (otherwise): data/local/*.json next to the project. Handy on your own computer;
 *   it won't work on hosts with a read-only disk such as Vercel.
 */

export type ListingStatus = "published" | "archived";
export type AdminListing = { event: RaceEvent; status: ListingStatus; origin: "seed" | "submission" | "database" };

type LocalListings = {
  /** Races published from approved submissions. */
  published: RaceEvent[];
  /** Admin changes to any listing, including the seed races. */
  overrides: Record<string, { status?: ListingStatus; verification?: RaceEvent["verification"]; verifiedAt?: string | null }>;
};

// ---------------------------------------------------------------- driver choice

let admin: SupabaseClient | null | undefined;
export function getAdminSupabase(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  admin = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return admin;
}

export function storageMode(): "supabase" | "local" {
  return getAdminSupabase() ? "supabase" : "local";
}

// ---------------------------------------------------------------- local JSON files

const LOCAL_DIR = process.env.STRIDE_LOCAL_DATA_DIR ?? path.join(process.cwd(), "data", "local");
const SUBMISSIONS_FILE = () => path.join(LOCAL_DIR, "submissions.json");
const LISTINGS_FILE = () => path.join(LOCAL_DIR, "listings.json");

export async function readLocalListings(): Promise<LocalListings> {
  const raw = await readJson<LocalListings>(LISTINGS_FILE(), { published: [], overrides: {} });
  return {
    published: (raw.published ?? []).map((e) => raceEventSchema.parse(e)),
    overrides: raw.overrides ?? {},
  };
}

function updateLocalListings(fn: (l: LocalListings) => void) {
  return serial(async () => {
    const l = await readLocalListings();
    fn(l);
    await writeJson(LISTINGS_FILE(), l);
  });
}

// ---------------------------------------------------------------- Supabase rows

type SubmissionRow = {
  id: string;
  reference: string;
  status: SubmissionStatus;
  source: "app" | "web";
  contact_email: string;
  data: SubmissionInput;
  reviewer_note: string | null;
  internal_note: string | null;
  checklist: Submission["checklist"];
  published_slug: string | null;
  history: Submission["history"];
  created_at: string;
  updated_at: string;
};

const fromRow = (r: SubmissionRow): Submission => ({
  id: r.id,
  reference: r.reference,
  status: r.status,
  source: r.source,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  data: r.data,
  reviewerNote: r.reviewer_note,
  internalNote: r.internal_note,
  checklist: r.checklist ?? {},
  publishedSlug: r.published_slug,
  history: r.history ?? [],
});

const toRow = (s: Submission) => ({
  id: s.id,
  reference: s.reference,
  status: s.status,
  source: s.source,
  contact_email: s.data.organiser.email,
  data: s.data,
  reviewer_note: s.reviewerNote,
  internal_note: s.internalNote,
  checklist: s.checklist,
  published_slug: s.publishedSlug,
  history: s.history,
});

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

// ---------------------------------------------------------------- submissions

export async function listSubmissions(): Promise<Submission[]> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("submissions").select("*").order("created_at", { ascending: false });
    if (error) fail("Could not load submissions", error);
    return (data as SubmissionRow[]).map(fromRow);
  }
  const all = await readJson<Submission[]>(SUBMISSIONS_FILE(), []);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("submissions").select("*").eq("id", id).maybeSingle();
    if (error) fail("Could not load submission", error);
    return data ? fromRow(data as SubmissionRow) : null;
  }
  return (await listSubmissions()).find((s) => s.id === id) ?? null;
}

export async function getSubmissionByReference(reference: string): Promise<Submission | null> {
  const ref = reference.trim().toUpperCase();
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("submissions").select("*").eq("reference", ref).maybeSingle();
    if (error) fail("Could not load submission", error);
    return data ? fromRow(data as SubmissionRow) : null;
  }
  return (await listSubmissions()).find((s) => s.reference === ref) ?? null;
}

export async function createSubmission(input: SubmissionInput, source: Submission["source"]): Promise<Submission> {
  const now = new Date().toISOString();
  const sub: Submission = {
    id: randomUUID(),
    reference: newReference(),
    status: "pending",
    source,
    createdAt: now,
    updatedAt: now,
    data: input,
    reviewerNote: null,
    internalNote: null,
    checklist: {},
    publishedSlug: null,
    history: [{ at: now, action: "submitted", note: null }],
  };
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("submissions").insert(toRow(sub));
    if (error) fail("Could not save submission", error);
    return sub;
  }
  return serial(async () => {
    const all = await readJson<Submission[]>(SUBMISSIONS_FILE(), []);
    while (all.some((s) => s.reference === sub.reference)) sub.reference = newReference();
    all.push(sub);
    await writeJson(SUBMISSIONS_FILE(), all);
    return sub;
  });
}

/** Read-modify-write one submission. `fn` may throw to cancel. */
export async function updateSubmission(id: string, fn: (s: Submission) => void): Promise<Submission> {
  const db = getAdminSupabase();
  if (db) {
    const current = await getSubmission(id);
    if (!current) throw new Error("Submission not found");
    fn(current);
    current.updatedAt = new Date().toISOString();
    const { error } = await db.from("submissions").update(toRow(current)).eq("id", id);
    if (error) fail("Could not update submission", error);
    return current;
  }
  return serial(async () => {
    const all = await readJson<Submission[]>(SUBMISSIONS_FILE(), []);
    const s = all.find((x) => x.id === id);
    if (!s) throw new Error("Submission not found");
    fn(s);
    s.updatedAt = new Date().toISOString();
    await writeJson(SUBMISSIONS_FILE(), all);
    return s;
  });
}

// ---------------------------------------------------------------- listings

/** Add an approved race to the public list. */
export async function publishEvent(event: RaceEvent): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    let organiserId: string | null = null;
    if (event.organiser) {
      const { data, error } = await db
        .from("organisers")
        .upsert({ name: event.organiser }, { onConflict: "name" })
        .select("id")
        .single();
      if (error) fail("Could not save organiser", error);
      organiserId = (data as { id: string }).id;
    }
    const { data: row, error } = await db
      .from("events")
      .insert({
        slug: event.slug,
        name: event.name,
        event_date: event.date,
        start_time: event.startTime,
        region: event.region,
        city: event.city,
        venue: event.venue,
        organiser_id: organiserId,
        fee_summary: event.feeSummary,
        fee_kind: event.feeKind,
        currency: event.currency,
        registration_method: event.registration.method,
        registration_url: event.registration.url,
        registration_note: event.registration.note,
        highlights: event.highlights,
        walker_friendly: event.walkerFriendly,
        verification: event.verification,
        verified_at: event.verifiedAt,
        source_name: "Organiser submission",
        cover_color: event.coverColor,
        description: event.description,
        status: "published",
      })
      .select("id")
      .single();
    if (error) fail("Could not publish race", error);
    const eventId = (row as { id: string }).id;
    const { error: dErr } = await db.from("event_distances").insert(
      event.distances.map((d, i) => ({ event_id: eventId, label: d.label, category: d.category, price_minor: d.priceMinor, note: d.note, sort: i })),
    );
    if (dErr) fail("Could not save distances", dErr);
    return;
  }
  await updateLocalListings((l) => {
    l.published = l.published.filter((e) => e.slug !== event.slug);
    l.published.push(event);
  });
}

export async function setListingStatus(slug: string, status: ListingStatus): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("events").update({ status }).eq("slug", slug);
    if (error) fail("Could not update listing", error);
    return;
  }
  await updateLocalListings((l) => {
    l.overrides[slug] = { ...l.overrides[slug], status };
  });
}

export async function setListingVerification(slug: string, verification: RaceEvent["verification"], today: string): Promise<void> {
  const verifiedAt = verification === "verified" ? today : null;
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("events").update({ verification, verified_at: verifiedAt }).eq("slug", slug);
    if (error) fail("Could not update listing", error);
    return;
  }
  await updateLocalListings((l) => {
    l.overrides[slug] = { ...l.overrides[slug], verification, verifiedAt };
  });
}

/** Apply local admin changes to a list of races (local mode only). Archived races are dropped. */
export function applyLocalListings(seed: RaceEvent[], local: LocalListings): AdminListing[] {
  const fromSeed = seed.map((event) => ({ event, origin: "seed" as const }));
  const fromSubs = local.published.map((event) => ({ event, origin: "submission" as const }));
  return [...fromSeed.filter((s) => !local.published.some((p) => p.slug === s.event.slug)), ...fromSubs]
    .map(({ event, origin }) => {
      const o = local.overrides[event.slug] ?? {};
      return {
        origin,
        status: o.status ?? ("published" as const),
        event: {
          ...event,
          verification: o.verification ?? event.verification,
          verifiedAt: o.verification ? (o.verifiedAt ?? null) : event.verifiedAt,
        },
      };
    })
    .sort((a, b) => a.event.date.localeCompare(b.event.date));
}
