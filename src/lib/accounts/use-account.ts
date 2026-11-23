"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export type AccountState =
  | { status: "loading" }
  | { status: "off" } // Supabase isn't set up for this site yet
  | { status: "signed-out"; supabase: SupabaseClient }
  | { status: "signed-in"; supabase: SupabaseClient; user: User };

export type Profile = { name: string; email: string; phone: string };

export function profileOf(user: User): Profile {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    name: typeof m.full_name === "string" ? m.full_name : "",
    email: user.email ?? "",
    phone: typeof m.phone === "string" ? m.phone : "",
  };
}

const claimed = new Set<string>();
/** Remembered for the browser tab, so it runs once per visit rather than on every page. */
function alreadyClaimed(id: string): boolean {
  try {
    if (sessionStorage.getItem("stride-gh-claimed") === id) return true;
    sessionStorage.setItem("stride-gh-claimed", id);
  } catch {}
  return false;
}

/**
 * The visitor's account. Loads Supabase only once the page is on screen, so pages that
 * don't need it stay light.
 */
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    import("../supabase/browser").then(async ({ getBrowserSupabase }) => {
      const supabase = getBrowserSupabase();
      if (cancelled) return;
      if (!supabase) return setState({ status: "off" });
      const set = (user: User | null | undefined) => {
        if (cancelled) return;
        setState(user ? { status: "signed-in", supabase, user } : { status: "signed-out", supabase });
        // Link reminders and alerts this person set up before signing in (same email). Once per visit.
        if (user && !claimed.has(user.id) && !alreadyClaimed(user.id)) {
          claimed.add(user.id);
          void supabase.rpc("claim_my_subscriptions").then(
            () => {},
            () => {},
          );
        }
      };
      const { data } = await supabase.auth.getSession();
      set(data.session?.user);
      const sub = supabase.auth.onAuthStateChange((_event, session) => set(session?.user));
      stop = () => sub.data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return state;
}
