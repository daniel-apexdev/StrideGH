import bundledEvents from '../../../data/events.seed.json';
import bundledStores from '../../../data/stores.seed.json';

import { API_BASE } from './config';
import { todayISO, type RaceEvent } from './races';
import { sortStores, type Store } from './stores';
import type { PublicSubmission } from './submission';

export class ApiError extends Error {
  status: number;
  /** true when the server could not be reached at all */
  offline: boolean;
  /** Field problems from the website's form check, keyed like "organiser.email". */
  fields: Record<string, string>;
  /** Machine-readable reason from the API, e.g. "account_exists". */
  code: string | null;
  /** Extra details sent with the error, e.g. { resendIn: 20 }. */
  extra: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    offline = false,
    fields: Record<string, string> = {},
    code: string | null = null,
    extra = {},
  ) {
    super(message);
    this.status = status;
    this.offline = offline;
    this.fields = fields;
    this.code = code;
    this.extra = extra;
  }
}

const TIMEOUT_MS = 12_000;

async function get<T>(path: string): Promise<T> {
  return send<T>('GET', path);
}

async function send<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, token?: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("We couldn't reach Stride GH. Check your connection, or that the website is running on your computer.", 0, true);
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json().catch(() => null)) as
    ({ error?: string; code?: string; fields?: Record<string, string> } & Record<string, unknown>) | null;
  if (!res.ok) {
    const { error, code, fields, ...extra } = json ?? {};
    throw new ApiError(error ?? `Request failed (${res.status})`, res.status, false, fields ?? {}, code ?? null, extra);
  }
  return json as T;
}

export type EventsResponse = {
  today: string;
  events: RaceEvent[];
  /** 'live' = from the website's API; 'bundled' = the copy built into the app, used when the API can't be reached. */
  source: 'live' | 'bundled';
  /** Why live data wasn't used (only when source is 'bundled'). */
  problem?: string;
};
export type EventResponse = { today: string; event: RaceEvent };
export type StoresResponse = { stores: Store[]; source: 'live' | 'bundled' };
export type Account = { id: string; email: string; name: string; phone: string | null; memberSince: string };
export type AuthStart = {
  email: string;
  purpose: 'signup' | 'signin';
  expiresInMinutes: number;
  resendIn: number;
  /** Only from a development computer without email set up. */
  devCode?: string;
};

/**
 * Every screen needs the race list, so keep one copy for a minute and share it.
 * Pull-to-refresh passes fresh = true.
 */
let cached: { at: number; promise: Promise<EventsResponse> } | null = null;
let storesCache: { at: number; promise: Promise<StoresResponse> } | null = null;
const CACHE_MS = 60_000;

export const api = {
  events(fresh = false): Promise<EventsResponse> {
    if (!fresh && cached && Date.now() - cached.at < CACHE_MS) return cached.promise;
    const promise = get<Omit<EventsResponse, 'source'>>('/events')
      .then((r): EventsResponse => ({ ...r, source: 'live' }))
      .catch((e: unknown): EventsResponse => ({
        // Same file the website serves from, bundled at build time (see metro.config.js).
        today: todayISO(),
        events: bundledEvents as RaceEvent[],
        source: 'bundled',
        problem: e instanceof Error ? e.message : String(e),
      }));
    cached = { at: Date.now(), promise };
    // Don't hold on to the offline copy: the next screen should try live data again.
    promise.then((r) => {
      if (r.source === 'bundled' && cached?.promise === promise) cached = null;
    });
    return promise;
  },
  /** Local shops and their products, with the bundled copy as the offline fallback. */
  stores(fresh = false): Promise<StoresResponse> {
    if (!fresh && storesCache && Date.now() - storesCache.at < CACHE_MS) return storesCache.promise;
    const promise = get<{ stores: Store[] }>('/stores')
      .then((r): StoresResponse => ({ stores: sortStores(r.stores), source: 'live' }))
      .catch((): StoresResponse => ({ stores: sortStores((bundledStores as { stores: Store[] }).stores), source: 'bundled' }));
    storesCache = { at: Date.now(), promise };
    promise.then((r) => {
      if (r.source === 'bundled' && storesCache?.promise === promise) storesCache = null;
    });
    return promise;
  },
  event(slug: string): Promise<EventResponse> {
    return get<EventResponse>(`/events/${encodeURIComponent(slug)}`);
  },
  /** Send a race for review. `website` is the website form's spam trap and always empty here. */
  submit(input: object): Promise<{ submission: PublicSubmission }> {
    return send('POST', '/submissions', { ...input, source: 'app', website: '' });
  },
  /** Send an edited race back after the review team asked for changes. */
  resubmit(reference: string, input: object): Promise<{ submission: PublicSubmission }> {
    return send('PUT', `/submissions/${encodeURIComponent(reference)}`, input);
  },
  /** Email a sign-in code. */
  authStart(body: { mode: 'signup'; name: string; email: string; phone: string } | { mode: 'signin'; email: string }): Promise<AuthStart> {
    return send('POST', '/auth/start', body);
  },
  authVerify(email: string, code: string): Promise<{ token: string; user: Account; isNew: boolean }> {
    return send('POST', '/auth/verify', { email, code });
  },
  me(token: string): Promise<{ user: Account }> {
    return send('GET', '/auth/me', undefined, token);
  },
  signOut(token: string): Promise<{ ok: true }> {
    return send('POST', '/auth/signout', {}, token);
  },
  submission(reference: string, email: string): Promise<{ submission: PublicSubmission }> {
    return get(`/submissions/${encodeURIComponent(reference.trim().toUpperCase())}?email=${encodeURIComponent(email.trim())}`);
  },
};
