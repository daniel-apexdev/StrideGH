import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

/**
 * Read-only Supabase client for public data on the server.
 * Returns null unless DATA_SOURCE=supabase, so races and shops come from data/*.seed.json.
 * (The same Supabase project can be used for website accounts without moving the race data.)
 */
export function getPublicSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (process.env.DATA_SOURCE !== "supabase") return (client = null);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}
