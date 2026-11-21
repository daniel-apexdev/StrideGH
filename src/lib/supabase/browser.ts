import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase in the visitor's browser, used for website accounts (email codes and sign-in).
 * Works on GitHub Pages too, because the browser talks to Supabase directly.
 * Only the public URL and anon key are used here; the service role key never reaches the browser.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const accountsConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "stride-gh-auth" } });
  return client;
}
