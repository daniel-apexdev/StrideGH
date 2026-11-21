import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/**
 * Admin sign-in for the review portal.
 * One shared password (ADMIN_PASSWORD) and a signed, http-only cookie (SESSION_SECRET).
 * Fine for a solo team; move to Supabase Auth with an admin role when more people review listings.
 */

export const ADMIN_COOKIE = "stride_admin";
const SESSION_HOURS = 12;

export function adminConfigured(): boolean {
  return !!process.env.ADMIN_PASSWORD && (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}

function sign(value: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passwordMatches(input: string): boolean {
  if (!adminConfigured()) return false;
  // Compare HMACs so the comparison is constant-time whatever the lengths.
  return safeEqual(sign(`pw:${input}`), sign(`pw:${process.env.ADMIN_PASSWORD}`));
}

export function newSessionToken(now = Date.now()): { token: string; expires: Date } {
  const expires = new Date(now + SESSION_HOURS * 3600_000);
  const payload = `admin.${expires.getTime()}`;
  return { token: `${payload}.${sign(payload)}`, expires };
}

export function sessionValid(token: string | undefined, now = Date.now()): boolean {
  if (!token || !adminConfigured()) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const [who, exp] = payload.split(".");
  if (who !== "admin" || !(Number(exp) > now)) return false;
  return safeEqual(token.slice(i + 1), sign(payload));
}

export async function isAdmin(): Promise<boolean> {
  // Admin pages always render per request (they read the clock and the session cookie).
  await connection();
  return sessionValid((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Call at the top of every admin page and Server Action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
