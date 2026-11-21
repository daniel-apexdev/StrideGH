import { useSyncExternalStore } from 'react';

import { storage } from './storage';

/**
 * Saved races live on the phone for now (no account needed).
 * When accounts launch, sync this list with the website's saved_items on sign-in.
 */
const KEY = 'stride.saved-races';
let slugs: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadSaved() {
  try {
    const raw = await storage.get(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) slugs = parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    slugs = [];
  }
  emit();
}

/** Adds or removes a race. Returns true if it is now saved. */
export function toggleSaved(slug: string): boolean {
  const on = !slugs.includes(slug);
  slugs = on ? [...slugs, slug] : slugs.filter((s) => s !== slug);
  emit();
  storage.set(KEY, JSON.stringify(slugs));
  return on;
}

/** Removes several at once, e.g. "Clear past races". */
export function removeSaved(remove: string[]) {
  slugs = slugs.filter((s) => !remove.includes(s));
  emit();
  storage.set(KEY, JSON.stringify(slugs));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSaved(): string[] {
  return useSyncExternalStore(subscribe, () => slugs);
}
