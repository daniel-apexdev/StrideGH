// Checks your email settings and sends one test message.
// Usage:  npm run email:test -- you@example.com
import { existsSync } from "node:fs";
import nodemailer from "nodemailer";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const to = process.argv[2] ?? process.env.GMAIL_USER;
const user = process.env.GMAIL_USER?.trim();
const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");

if (!user || !pass) {
  console.error("✗ GMAIL_USER and GMAIL_APP_PASSWORD aren't both set in .env.local.");
  process.exit(1);
}
if (!to) {
  console.error("✗ Add the address to send to: npm run email:test -- you@example.com");
  process.exit(1);
}

const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });

try {
  await transport.verify();
  console.log(`✓ Signed in to Gmail as ${user}`);
} catch (e) {
  console.error(`✗ Gmail refused the login: ${e.message}`);
  if (/Username and Password not accepted|BadCredentials|535/.test(e.message)) {
    console.error(
      "  Use a Google App Password, not your normal password: Google Account → Security → 2-Step Verification → App passwords.",
    );
  }
  process.exit(1);
}

const info = await transport.sendMail({
  from: { name: process.env.EMAIL_FROM_NAME?.trim() || "Stride GH", address: user },
  to,
  subject: "Stride GH test email",
  text: "If you can read this, Stride GH can send email. Sign-in codes and race updates will arrive like this.",
  html: `<div style="font-family:Arial,sans-serif;font-size:16px"><p><strong style="background:#c6f24e;padding:2px 6px;border-radius:4px">S</strong> <strong>Stride GH</strong></p><p>If you can read this, Stride GH can send email. Sign-in codes and race updates will arrive like this.</p></div>`,
});
console.log(`✓ Sent to ${to} (message ${info.messageId}). Check the inbox, and the spam folder the first time.`);
