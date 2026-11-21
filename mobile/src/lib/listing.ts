import { useSyncExternalStore } from 'react';

import { storage } from './storage';
import { emptyDraft, type FormDraft } from './submission';

/**
 * The organiser's half-finished form and the races they've sent from this phone.
 * Secure storage keeps values small, so longer text is saved in pieces.
 */
const DRAFT_KEY = 'stride.list-draft';
const MINE_KEY = 'stride.my-submissions';
const PART = 1800;

async function setLarge(key: string, value: string) {
  const parts = Math.ceil(value.length / PART) || 1;
  const old = Number((await storage.get(`${key}.n`)) ?? 0);
  for (let i = 0; i < parts; i++) await storage.set(`${key}.${i}`, value.slice(i * PART, (i + 1) * PART));
  for (let i = parts; i < old; i++) await storage.remove(`${key}.${i}`);
  await storage.set(`${key}.n`, String(parts));
}
async function getLarge(key: string): Promise<string | null> {
  const n = Number((await storage.get(`${key}.n`)) ?? 0);
  if (!n) return null;
  let out = '';
  for (let i = 0; i < n; i++) out += (await storage.get(`${key}.${i}`)) ?? '';
  return out;
}
async function removeLarge(key: string) {
  const n = Number((await storage.get(`${key}.n`)) ?? 0);
  for (let i = 0; i < n; i++) await storage.remove(`${key}.${i}`);
  await storage.remove(`${key}.n`);
}

export type Draft = { draft: FormDraft; step: number; resubmit: string | null };

export async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = await getLarge(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    return { ...parsed, draft: { ...emptyDraft(), ...parsed.draft } };
  } catch {
    return null;
  }
}
export const saveDraft = (d: Draft) => setLarge(DRAFT_KEY, JSON.stringify(d)).catch(() => {});
export const clearDraft = () => removeLarge(DRAFT_KEY).catch(() => {});

// ------------------------------------------------------------ sent from this phone

export type Mine = { reference: string; email: string; name: string; sentAt: string };
let mine: Mine[] = [];
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadMine() {
  try {
    const raw = await getLarge(MINE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) mine = parsed as Mine[];
  } catch {
    mine = [];
  }
  loaded = true;
  emit();
}

export function rememberMine(m: Mine) {
  mine = [m, ...mine.filter((x) => x.reference !== m.reference)].slice(0, 20);
  emit();
  setLarge(MINE_KEY, JSON.stringify(mine)).catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!loaded) loadMine();
  return () => listeners.delete(l);
}
export function useMine(): Mine[] {
  return useSyncExternalStore(subscribe, () => mine);
}
