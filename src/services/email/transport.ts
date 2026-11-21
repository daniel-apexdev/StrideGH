import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * How email leaves the website. Picks the first provider that's configured:
 *   1. Gmail over SMTP — GMAIL_USER + GMAIL_APP_PASSWORD
 *   2. Resend's API   — RESEND_API_KEY + EMAIL_FROM
 *   3. Nothing        — in development the email is printed in the terminal; in production sending fails loudly.
 */

export type Email = { to: string; subject: string; text: string; html: string; replyTo?: string };
export type Provider = "gmail" | "resend" | "none";

export class EmailNotConfigured extends Error {}

export function emailProvider(): Provider {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return "resend";
  return "none";
}

export const emailConfigured = () => emailProvider() !== "none";

/** True when emails (and sign-in codes) are shown in the terminal instead of being sent. */
export const emailDevMode = () => !emailConfigured() && process.env.NODE_ENV !== "production";

const fromName = () => process.env.EMAIL_FROM_NAME?.trim() || "Stride GH";

let gmail: Transporter | null = null;
function gmailTransport(): Transporter {
  gmail ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!.trim(),
      // Google shows app passwords in groups of four ("abcd efgh ijkl mnop"); the spaces aren't part of it.
      pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, ""),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return gmail;
}

export async function deliver(mail: Email): Promise<void> {
  const provider = emailProvider();
  const replyTo = mail.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined;

  if (provider === "gmail") {
    // Gmail only sends from the signed-in address, so the "from" is always GMAIL_USER.
    await gmailTransport().sendMail({
      from: { name: fromName(), address: process.env.GMAIL_USER!.trim() },
      to: mail.to,
      replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return;
  }

  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [mail.to], reply_to: replyTo, subject: mail.subject, text: mail.text, html: mail.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new EmailNotConfigured("Email sending isn't set up (GMAIL_USER + GMAIL_APP_PASSWORD, or RESEND_API_KEY + EMAIL_FROM).");
  }
  console.log(
    `\n┌─ Email (not sent — set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send for real)\n│ To: ${mail.to}\n│ ${mail.subject}\n│\n${mail.text.replace(/^/gm, "│ ")}\n└─\n`,
  );
}

/** Checks the Gmail login without sending anything (used by `npm run email:test`). */
export async function verifyTransport(): Promise<string> {
  const provider = emailProvider();
  if (provider === "gmail") {
    await gmailTransport().verify();
    return `Gmail SMTP login OK for ${process.env.GMAIL_USER}`;
  }
  return provider === "resend" ? "Using Resend (no login check available)" : "No email provider configured";
}
