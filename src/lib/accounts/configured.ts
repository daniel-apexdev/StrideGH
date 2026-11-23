/**
 * Whether website accounts (Supabase) are set up for this build. Safe to use anywhere,
 * including server components: it only checks that the two public settings exist.
 */
export const accountsOn = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
