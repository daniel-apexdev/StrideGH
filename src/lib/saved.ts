"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved races live on the device for now (no account needed).
 * When accounts launch, sync this list to the `saved_items` table on sign-in.
 */
const KEY = "stride:saved-events";
const EVENT = "stride:saved-change";
const EMPTY: string[] = [];
let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedList;
    cachedRaw = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : EMPTY;
    return cachedList;
  } catch {
    return EMPTY;
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage can be unavailable (private mode). Saving just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSavedEvents() {
  const saved = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((slug: string) => {
    const list = read();
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
    write(next);
    return next.includes(slug);
  }, []);
  return { saved, isSaved: (slug: string) => saved.includes(slug), toggle };
}
