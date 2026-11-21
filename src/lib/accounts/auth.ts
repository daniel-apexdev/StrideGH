import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { E164, EMAIL, parsePhone, phoneProblem } from "../contact";
import { EmailNotConfigured, emailDevMode, sendEmail, signInCodeEmail } from "@/services/email";
import {
  createSession,
  deleteCode,
  deleteSession,
  findUserByEmail,
  findUserById,
  getCode,
  getSession,
  markSignedIn,
  saveCode,
  upsertUnverifiedUser,
  type User,
} from "./store";

/**
 * Passwordless accounts: we email a 6-digit code to create the account (which verifies the email),
 * and again each time someone signs in on a new device.
 */

export const CODE_MINUTES = 10;
export const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;
const SESSION_DAYS = 90;

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, memberSince: u.verifiedAt ?? u.createdAt });
export type PublicUser = ReturnType<typeof publicUser>;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new AuthError("Accounts aren't set up on this server yet (SESSION_SECRET is missing).", 503, "not_configured");
  return s;
}
const hashCode = (email: string, code: string) => createHmac("sha256", secret()).update(`code:${email}:${code}`).digest("base64url");
const hashToken = (token: string) => createHash("sha256").update(token).digest("base64url");

export const startSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("signup"),
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().trim().toLowerCase().regex(EMAIL, "Enter a valid email address, e.g. ama@gmail.com").max(120),
    phone: z
      .string()
      .trim()
      .regex(E164, "Choose the country code and enter your number")
      .superRefine((v, ctx) => {
        const p = parsePhone(v);
        const issue = phoneProblem(p.country, p.number);
        if (issue) ctx.addIssue({ code: "custom", message: issue });
      }),
  }),
  z.object({
    mode: z.literal("signin"),
    email: z.string().trim().toLowerCase().regex(EMAIL, "Enter a valid email address, e.g. ama@gmail.com").max(120),
  }),
]);
export type StartInput = z.infer<typeof startSchema>;

/** Step 1: check the request and email a fresh code. */
export async function startCode(input: StartInput, now = Date.now()) {
  secret();
  const existing = await findUserByEmail(input.email);
  if (input.mode === "signup" && existing?.verifiedAt) {
    throw new AuthError("There's already an account with this email. Sign in instead.", 409, "account_exists");
  }
  if (input.mode === "signin" && !existing) {
    throw new AuthError("We couldn't find an account with that email. Check it, or create an account.", 404, "no_account");
  }

  const previous = await getCode(input.email);
  const recent = (previous?.sentAt ?? []).filter((t) => now - Date.parse(t) < 3600_000);
  const last = recent.at(-1);
  if (last && now - Date.parse(last) < RESEND_SECONDS * 1000) {
    const wait = Math.ceil((RESEND_SECONDS * 1000 - (now - Date.parse(last))) / 1000);
    throw new AuthError(`Wait ${wait} seconds before asking for another code.`, 429, "too_soon", { resendIn: wait });
  }
  if (recent.length >= MAX_SENDS_PER_HOUR) {
    throw new AuthError("Too many codes for this email. Try again in an hour.", 429, "too_many");
  }

  const user = input.mode === "signup" ? await upsertUnverifiedUser({ email: input.email, name: input.name, phone: input.phone }) : existing!;
  const purpose = input.mode === "signup" || !user.verifiedAt ? "signup" : "signin";
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await saveCode({
    email: input.email,
    purpose,
    hash: hashCode(input.email, code),
    expiresAt: new Date(now + CODE_MINUTES * 60_000).toISOString(),
    attempts: 0,
    sentAt: [...recent, new Date(now).toISOString()],
  });
  try {
    await sendEmail({ to: input.email, ...signInCodeEmail({ code, name: user.name, purpose, minutes: CODE_MINUTES }) });
  } catch (e) {
    // Undo, so the failed attempt doesn't count against the resend wait or hourly limit.
    if (previous) await saveCode(previous);
    else await deleteCode(input.email);
    if (e instanceof EmailNotConfigured) throw e;
    console.error(`[auth] Couldn't email a code to ${input.email}:`, e instanceof Error ? e.message : e);
    throw new AuthError("We couldn't send the email just now. Check the address and try again in a moment.", 502, "email_failed");
  }

  return {
    email: input.email,
    purpose,
    expiresInMinutes: CODE_MINUTES,
    resendIn: RESEND_SECONDS,
    // Only while email isn't set up on a development computer, so sign-up can be tested.
    ...(emailDevMode() ? { devCode: code } : {}),
  };
}

/** Step 2: check the code, verify the email, and start a session. */
export async function verifyCode(emailInput: string, codeInput: string, now = Date.now()) {
  secret();
  const email = emailInput.trim().toLowerCase();
  const code = codeInput.replace(/\D/g, "");
  const record = await getCode(email);
  if (!record || Date.parse(record.expiresAt) < now) {
    throw new AuthError("That code has expired. Send a new one.", 400, "expired");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw new AuthError("Too many wrong tries. Send a new code.", 429, "locked");
  }
  const a = Buffer.from(hashCode(email, code));
  const b = Buffer.from(record.hash);
  if (code.length !== 6 || a.length !== b.length || !timingSafeEqual(a, b)) {
    const left = MAX_ATTEMPTS - record.attempts - 1;
    await saveCode({ ...record, attempts: record.attempts + 1 });
    throw new AuthError(
      left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Send a new code.",
      left > 0 ? 400 : 429,
      left > 0 ? "wrong_code" : "locked",
    );
  }
  await deleteCode(email);
  const found = await findUserByEmail(email);
  if (!found) throw new AuthError("We couldn't find that account. Start again.", 404, "no_account");
  const user = await markSignedIn(found.id);

  const token = randomBytes(32).toString("base64url");
  await createSession({
    hash: hashToken(token),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_DAYS * 86_400_000).toISOString(),
  });
  return { token, user: publicUser(user), isNew: record.purpose === "signup" };
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,})$/.exec(h);
  return m ? m[1] : null;
}

export async function userFromRequest(req: Request, now = Date.now()): Promise<User | null> {
  const token = bearer(req);
  if (!token) return null;
  const session = await getSession(hashToken(token));
  if (!session || Date.parse(session.expiresAt) < now) return null;
  return findUserById(session.userId);
}

export async function signOut(req: Request): Promise<void> {
  const token = bearer(req);
  if (token) await deleteSession(hashToken(token));
}
