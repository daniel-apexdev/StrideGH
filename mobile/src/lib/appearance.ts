import { useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type Palette } from '@/theme';

import { storage } from './storage';

export type Appearance = 'system' | 'light' | 'dark';

const KEY = 'stride.appearance';
let current: Appearance = 'system';
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Read the saved choice once at start-up. */
export async function loadAppearance() {
  const v = await storage.get(KEY);
  if (v === 'light' || v === 'dark' || v === 'system') current = v;
  loaded = true;
  emit();
}

export function setAppearance(next: Appearance) {
  current = next;
  emit();
  storage.set(KEY, next);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppearanceLoaded() {
  return useSyncExternalStore(subscribe, () => loaded);
}

/** The user's choice: System, Light or Dark. */
export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribe, () => current);
}

/** The mode actually in use after resolving "System" against the phone's setting. */
export function useScheme(): 'light' | 'dark' {
  const choice = useAppearance();
  const system = useColorScheme();
  if (choice === 'system') return system === 'dark' ? 'dark' : 'light';
  return choice;
}

export function useColors(): Palette {
  return useScheme() === 'dark' ? dark : light;
}
