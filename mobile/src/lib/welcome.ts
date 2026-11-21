import { useSyncExternalStore } from 'react';

import { storage } from './storage';

/**
 * Whether this phone has seen the welcome slides. Loaded before the first screen shows
 * (see app/_layout.tsx), so there's no flash of the wrong screen.
 */
const KEY = 'stride.welcomed';

let state: 'unknown' | 'yes' | 'no' = 'unknown';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadWelcomed() {
  state = (await storage.get(KEY)) === '1' ? 'yes' : 'no';
  emit();
}

export function markWelcomed() {
  state = 'yes';
  storage.set(KEY, '1');
  emit();
}

/** Show the welcome slides again next time the app reaches Home (Account → Show welcome again). */
export function resetWelcomed() {
  state = 'no';
  storage.remove(KEY);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useWelcomed() {
  return useSyncExternalStore(subscribe, () => state);
}
