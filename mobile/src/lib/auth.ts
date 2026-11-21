import { useSyncExternalStore } from 'react';

import { ApiError, api, type Account } from './api';
import { storage } from './storage';

/**
 * The signed-in account on this phone. Accounts have no password: an emailed code creates the
 * account (confirming the email) and signs in on each new device. The session token lives in
 * the phone's secure storage.
 */
const TOKEN_KEY = 'stride.session';
const USER_KEY = 'stride.account';

export type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: Account; token: string };

let state: AuthState = { status: 'loading' };
let started = false;
const listeners = new Set<() => void>();
const set = (s: AuthState) => {
  state = s;
  listeners.forEach((l) => l());
};

async function load() {
  const [token, raw] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
  if (!token || !raw) return set({ status: 'signedOut' });
  let user: Account;
  try {
    user = JSON.parse(raw) as Account;
  } catch {
    return set({ status: 'signedOut' });
  }
  set({ status: 'signedIn', user, token });
  // Refresh in the background; only a definite "signed out" from the server ends the session.
  try {
    const fresh = await api.me(token);
    const next = fresh.token ?? token;
    await Promise.all([storage.set(USER_KEY, JSON.stringify(fresh.user)), storage.set(TOKEN_KEY, next)]);
    if (state.status === 'signedIn' && state.token === token) set({ status: 'signedIn', user: fresh.user, token: next });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) await clear();
  }
}

async function clear() {
  await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
  set({ status: 'signedOut' });
}

export async function signedIn(token: string, user: Account) {
  await Promise.all([storage.set(TOKEN_KEY, token), storage.set(USER_KEY, JSON.stringify(user))]);
  set({ status: 'signedIn', user, token });
}

export async function signOut() {
  const s = state;
  await clear();
  if (s.status === 'signedIn') api.signOut(s.token).catch(() => {});
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!started) {
    started = true;
    load();
  }
  return () => listeners.delete(l);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const currentAuth = () => state;
