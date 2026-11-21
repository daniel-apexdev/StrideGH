import "server-only";
import { readJson, serial, writeJson, localFile } from "../local-files";
import { getAdminSupabase } from "../submissions/store";

/**
 * Accounts, one-time codes and sign-in sessions.
 * Supabase tables (app_users, auth_codes, auth_sessions) when the service role key is set,
 * otherwise data/local/accounts.json on this computer.
 */

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  verifiedAt: string | null;
  lastSignInAt: string | null;
};

export type CodeRecord = {
  email: string;
  purpose: "signup" | "signin";
  hash: string;
  expiresAt: string;
  attempts: number;
  /** When codes were sent for this email in the last hour (for rate limiting). */
  sentAt: string[];
};

export type Session = { hash: string; userId: string; createdAt: string; expiresAt: string };

type LocalAccounts = { users: User[]; codes: CodeRecord[]; sessions: Session[] };

const FILE = () => localFile("accounts.json");
const read = () => readJson<LocalAccounts>(FILE(), { users: [], codes: [], sessions: [] });
function change<T>(fn: (a: LocalAccounts) => T): Promise<T> {
  return serial(async () => {
    const a = await read();
    const out = fn(a);
    await writeJson(FILE(), a);
    return out;
  });
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

// ---------------------------------------------------------------- users

type UserRow = { id: string; email: string; name: string; phone: string | null; created_at: string; verified_at: string | null; last_sign_in_at: string | null };
const userFromRow = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  phone: r.phone,
  createdAt: r.created_at,
  verifiedAt: r.verified_at,
  lastSignInAt: r.last_sign_in_at,
});

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("app_users").select("*").eq("email", email).maybeSingle();
    if (error) fail("Could not load account", error);
    return data ? userFromRow(data as UserRow) : null;
  }
  return (await read()).users.find((u) => u.email === email) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("app_users").select("*").eq("id", id).maybeSingle();
    if (error) fail("Could not load account", error);
    return data ? userFromRow(data as UserRow) : null;
  }
  return (await read()).users.find((u) => u.id === id) ?? null;
}

/** Create the account, or refresh the details of one that was started but never confirmed. */
export async function upsertUnverifiedUser(input: { email: string; name: string; phone: string | null }): Promise<User> {
  const now = new Date().toISOString();
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db
      .from("app_users")
      .upsert({ email: input.email, name: input.name, phone: input.phone }, { onConflict: "email" })
      .select("*")
      .single();
    if (error) fail("Could not save account", error);
    return userFromRow(data as UserRow);
  }
  return change((a) => {
    let u = a.users.find((x) => x.email === input.email);
    if (u) Object.assign(u, { name: input.name, phone: input.phone });
    else {
      u = { id: crypto.randomUUID(), email: input.email, name: input.name, phone: input.phone, createdAt: now, verifiedAt: null, lastSignInAt: null };
      a.users.push(u);
    }
    return { ...u };
  });
}

export async function markSignedIn(id: string): Promise<User> {
  const now = new Date().toISOString();
  const db = getAdminSupabase();
  if (db) {
    const current = await findUserById(id);
    const { data, error } = await db
      .from("app_users")
      .update({ verified_at: current?.verifiedAt ?? now, last_sign_in_at: now })
      .eq("id", id)
      .select("*")
      .single();
    if (error) fail("Could not update account", error);
    return userFromRow(data as UserRow);
  }
  return change((a) => {
    const u = a.users.find((x) => x.id === id);
    if (!u) throw new Error("Account not found");
    u.verifiedAt ??= now;
    u.lastSignInAt = now;
    return { ...u };
  });
}

// ---------------------------------------------------------------- one-time codes

type CodeRow = { email: string; purpose: CodeRecord["purpose"]; code_hash: string; expires_at: string; attempts: number; sent_at: string[] };

export async function getCode(email: string): Promise<CodeRecord | null> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("auth_codes").select("*").eq("email", email).maybeSingle();
    if (error) fail("Could not load code", error);
    if (!data) return null;
    const r = data as CodeRow;
    return { email: r.email, purpose: r.purpose, hash: r.code_hash, expiresAt: r.expires_at, attempts: r.attempts, sentAt: r.sent_at ?? [] };
  }
  return (await read()).codes.find((c) => c.email === email) ?? null;
}

export async function saveCode(c: CodeRecord): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db
      .from("auth_codes")
      .upsert(
        { email: c.email, purpose: c.purpose, code_hash: c.hash, expires_at: c.expiresAt, attempts: c.attempts, sent_at: c.sentAt },
        { onConflict: "email" },
      );
    if (error) fail("Could not save code", error);
    return;
  }
  await change((a) => {
    a.codes = [...a.codes.filter((x) => x.email !== c.email), c];
  });
}

export async function deleteCode(email: string): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("auth_codes").delete().eq("email", email);
    if (error) fail("Could not clear code", error);
    return;
  }
  await change((a) => {
    a.codes = a.codes.filter((x) => x.email !== email);
  });
}

// ---------------------------------------------------------------- sessions

export async function createSession(s: Session): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("auth_sessions").insert({ token_hash: s.hash, user_id: s.userId, created_at: s.createdAt, expires_at: s.expiresAt });
    if (error) fail("Could not start session", error);
    return;
  }
  const now = new Date().toISOString();
  await change((a) => {
    a.sessions = [...a.sessions.filter((x) => x.expiresAt > now), s];
  });
}

export async function getSession(hash: string): Promise<Session | null> {
  const db = getAdminSupabase();
  if (db) {
    const { data, error } = await db.from("auth_sessions").select("*").eq("token_hash", hash).maybeSingle();
    if (error) fail("Could not load session", error);
    if (!data) return null;
    const r = data as { token_hash: string; user_id: string; created_at: string; expires_at: string };
    return { hash: r.token_hash, userId: r.user_id, createdAt: r.created_at, expiresAt: r.expires_at };
  }
  return (await read()).sessions.find((x) => x.hash === hash) ?? null;
}

export async function deleteSession(hash: string): Promise<void> {
  const db = getAdminSupabase();
  if (db) {
    const { error } = await db.from("auth_sessions").delete().eq("token_hash", hash);
    if (error) fail("Could not end session", error);
    return;
  }
  await change((a) => {
    a.sessions = a.sessions.filter((x) => x.hash !== hash);
  });
}
