import type { Account, AuthStart } from './api';
import { ApiError } from './api-error';

/**
 * Accounts through Supabase Auth, the same accounts as the website's Account page, so one
 * account works in both places. Used when EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY are set (otherwise the app uses the website's own /api/auth).
 *
 * Talks to Supabase's REST API directly, so no extra packages are needed. The "token" the rest
 * of the app stores is Supabase's refresh token; each app start swaps it for a fresh one.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseAccounts = Boolean(URL && KEY);

type SupaUser = { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> };
type SupaSession = { access_token: string; refresh_token: string; user: SupaUser };

async function call<T>(path: string, init: { method: string; body?: unknown; token?: string }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL}/auth/v1${path}`, {
      method: init.method,
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${init.token ?? KEY}`,
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('No connection. Check your internet and try again.', 0, true);
  }
  const json = (await res.json().catch(() => null)) as (Record<string, unknown> & { msg?: string; message?: string; error_code?: string; error_description?: string }) | null;
  if (!res.ok) throw toApiError(res.status, json);
  return json as T;
}

function toApiError(status: number, json: { msg?: string; message?: string; error_code?: string; error_description?: string } | null): ApiError {
  const raw = json?.msg ?? json?.message ?? json?.error_description ?? '';
  const m = raw.toLowerCase();
  const code = json?.error_code ?? '';
  const wait = Number(raw.match(/after (\d+) seconds?/)?.[1]);
  if (status === 429 || code.includes('rate_limit') || wait) {
    return new ApiError('Too many codes asked for. Wait a moment, then try again.', 429, false, {}, 'rate_limited', { resendIn: wait || 60 });
  }
  if (m.includes('signups not allowed') || code === 'otp_disabled' || m.includes('user not found')) {
    return new ApiError('There’s no account with this email yet. Create one instead.', 404, false, {}, 'no_account');
  }
  if (code === 'otp_expired' || m.includes('expired') || m.includes('invalid')) {
    return new ApiError('That code isn’t right or has expired. Check the latest email, or send a new code.', 400, false, {}, 'bad_code');
  }
  if (status === 401 || code === 'refresh_token_not_found' || code === 'session_not_found') {
    return new ApiError('Please sign in again.', 401, false, {}, 'signed_out');
  }
  return new ApiError('Something went wrong. Please try again.', status);
}

function toAccount(u: SupaUser): Account {
  const m = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? '',
    name: typeof m.full_name === 'string' && m.full_name ? m.full_name : (u.email ?? '').split('@')[0],
    phone: typeof m.phone === 'string' && m.phone ? m.phone : null,
    memberSince: u.created_at,
  };
}

/** Details typed on "Create account", used to fill gaps after the code is checked. */
let pendingDetails: { full_name: string; phone: string } | null = null;

export const supabaseAuth = {
  async start(body: { mode: 'signup'; name: string; email: string; phone: string } | { mode: 'signin'; email: string }): Promise<AuthStart> {
    const email = body.email.trim().toLowerCase();
    pendingDetails = body.mode === 'signup' ? { full_name: body.name, phone: body.phone } : null;
    await call('/otp', {
      method: 'POST',
      body: {
        email,
        create_user: body.mode === 'signup',
        ...(body.mode === 'signup' ? { data: pendingDetails } : {}),
      },
    });
    return { email, purpose: body.mode, expiresInMinutes: 60, resendIn: 60 };
  },

  async verify(email: string, code: string): Promise<{ token: string; user: Account; isNew: boolean }> {
    const s = await call<SupaSession>('/verify', { method: 'POST', body: { email, token: code, type: 'email' } });
    let user = s.user;
    const m = user.user_metadata ?? {};
    // Someone who already had an account and used "Create account": keep their details, fill any gaps.
    if (pendingDetails && (!m.full_name || !m.phone)) {
      user = await call<SupaUser>('/user', {
        method: 'PUT',
        token: s.access_token,
        body: { data: { full_name: m.full_name || pendingDetails.full_name, phone: m.phone || pendingDetails.phone } },
      }).catch(() => user);
    }
    pendingDetails = null;
    const isNew = Date.now() - Date.parse(user.created_at) < 10 * 60_000;
    return { token: s.refresh_token, user: toAccount(user), isNew };
  },

  /** Swaps the stored refresh token for a new one and returns the latest account details. */
  async me(token: string): Promise<{ user: Account; token: string }> {
    const s = await call<SupaSession>('/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: token } });
    return { user: toAccount(s.user), token: s.refresh_token };
  },

  async signOut(token: string): Promise<{ ok: true }> {
    // Ends the session on Supabase too, so the stored token can't be reused.
    const s = await call<SupaSession>('/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: token } });
    await call('/logout', { method: 'POST', token: s.access_token });
    return { ok: true };
  },
};
