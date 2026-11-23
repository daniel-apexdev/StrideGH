"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RaceEntry, Review } from "./core";

/**
 * Runner features in the browser, through Supabase (see supabase/migrations/…_runner_features.sql).
 * Works on the static GitHub Pages site: Row Level Security decides what each visitor can do.
 */

export class RunnerError extends Error {}

type PgError = { code?: string; message?: string } | null;

function fail(error: PgError): never {
  const m = (error?.message ?? "").toLowerCase();
  if (m.includes("fetch") || m.includes("network")) throw new RunnerError("No connection. Check your internet and try again.");
  if (m.includes("relation") && m.includes("does not exist"))
    throw new RunnerError("This isn't switched on yet. Please try again later.");
  throw new RunnerError("Something went wrong. Please try again.");
}

const isDuplicate = (error: PgError) => error?.code === "23505";

const entryColumns =
  "id, race_slug, race_name, race_date, region, distance_label, distance_category, distance_km, finish_seconds, note";

// Races I'm running / have run --------------------------------------------------------------

export async function getEntry(sb: SupabaseClient, slug: string): Promise<RaceEntry | null> {
  const { data, error } = await sb.from("race_entries").select(entryColumns).eq("race_slug", slug).maybeSingle();
  if (error) fail(error);
  return (data as RaceEntry | null) ?? null;
}

export async function myEntries(sb: SupabaseClient): Promise<RaceEntry[]> {
  const { data, error } = await sb.from("race_entries").select(entryColumns).order("race_date", { ascending: false });
  if (error) fail(error);
  return (data as RaceEntry[]) ?? [];
}

export async function saveEntry(
  sb: SupabaseClient,
  userId: string,
  entry: Omit<RaceEntry, "id" | "finish_seconds" | "note"> & { finish_seconds?: number | null; note?: string | null },
): Promise<RaceEntry> {
  const { data, error } = await sb
    .from("race_entries")
    .upsert({ ...entry, user_id: userId }, { onConflict: "user_id,race_slug" })
    .select(entryColumns)
    .single();
  if (error) fail(error);
  return data as RaceEntry;
}

export async function removeEntry(sb: SupabaseClient, slug: string): Promise<void> {
  const { error } = await sb.from("race_entries").delete().eq("race_slug", slug);
  if (error) fail(error);
}

// Reminder emails for one race -------------------------------------------------------------

/** Returns false if this email already gets reminders for the race. */
export async function addReminder(sb: SupabaseClient, email: string, slug: string, userId?: string): Promise<boolean> {
  const { error } = await sb
    .from("race_reminders")
    .insert({ email: email.trim().toLowerCase(), race_slug: slug, user_id: userId ?? null });
  if (isDuplicate(error)) return false;
  if (error) fail(error);
  return true;
}

export type MyReminder = { id: string; race_slug: string; email: string; created_at: string };

export async function myReminders(sb: SupabaseClient): Promise<MyReminder[]> {
  const { data, error } = await sb.from("race_reminders").select("id, race_slug, email, created_at").order("created_at");
  if (error) fail(error);
  return (data as MyReminder[]) ?? [];
}

export async function removeReminder(sb: SupabaseClient, slug: string): Promise<void> {
  const { error } = await sb.from("race_reminders").delete().eq("race_slug", slug);
  if (error) fail(error);
}

// New-race alerts ----------------------------------------------------------------------------

export type Alert = { id: string; email: string; distances: string[]; cities: string[] };

export async function myAlert(sb: SupabaseClient): Promise<Alert | null> {
  const { data, error } = await sb.from("race_alerts").select("id, email, distances, cities").maybeSingle();
  if (error) fail(error);
  return (data as Alert | null) ?? null;
}

/**
 * Signs an email up for alerts (or updates a signed-in runner's own). Returns "exists" when a
 * visitor without an account uses an email that's already signed up.
 */
export async function saveAlert(
  sb: SupabaseClient,
  alert: { email: string; distances: string[]; cities: string[] },
  mine?: { userId: string; existingId: string | null },
): Promise<"saved" | "exists"> {
  const row = { email: alert.email.trim().toLowerCase(), distances: alert.distances, cities: alert.cities };
  if (mine?.existingId) {
    const { error } = await sb.from("race_alerts").update(row).eq("id", mine.existingId);
    if (error) fail(error);
    return "saved";
  }
  const { error } = await sb.from("race_alerts").insert({ ...row, user_id: mine?.userId ?? null });
  if (isDuplicate(error)) return "exists";
  if (error) fail(error);
  return "saved";
}

export async function removeAlert(sb: SupabaseClient, id: string): Promise<void> {
  const { error } = await sb.from("race_alerts").delete().eq("id", id);
  if (error) fail(error);
}

// App waiting list --------------------------------------------------------------------------

/** Returns false if the email is already on the list (that's fine: nothing to do). */
export async function joinWaitlist(sb: SupabaseClient, email: string, source = "website"): Promise<boolean> {
  const { error } = await sb.from("app_waitlist").insert({ email: email.trim().toLowerCase(), source });
  if (isDuplicate(error)) return false;
  if (error) fail(error);
  return true;
}

// Reviews -----------------------------------------------------------------------------------

export async function raceReviews(sb: SupabaseClient, slug: string): Promise<Review[]> {
  const { data, error } = await sb
    .from("race_reviews")
    .select("id, user_id, reviewer_name, overall, course, organisation, water, medal, comment, created_at")
    .eq("race_slug", slug)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail(error);
  return (data as Review[]) ?? [];
}

export async function saveReview(
  sb: SupabaseClient,
  userId: string,
  slug: string,
  review: Pick<Review, "reviewer_name" | "overall" | "course" | "organisation" | "water" | "medal" | "comment">,
): Promise<void> {
  const { error } = await sb
    .from("race_reviews")
    .upsert({ ...review, user_id: userId, race_slug: slug }, { onConflict: "user_id,race_slug" });
  if (error) fail(error);
}

export async function deleteReview(sb: SupabaseClient, slug: string): Promise<void> {
  const { error } = await sb.from("race_reviews").delete().eq("race_slug", slug);
  if (error) fail(error);
}

// Unsubscribe and account linking -----------------------------------------------------------

/** From the link in an email. Returns what was stopped. */
export async function unsubscribe(sb: SupabaseClient, token: string): Promise<"reminder" | "alerts" | "none"> {
  const { data, error } = await sb.rpc("unsubscribe", { p_token: token });
  if (error) fail(error);
  return data as "reminder" | "alerts" | "none";
}

/** After signing in: link reminders and alerts set up earlier with the same email. */
export async function claimSubscriptions(sb: SupabaseClient): Promise<void> {
  await sb.rpc("claim_my_subscriptions");
}
