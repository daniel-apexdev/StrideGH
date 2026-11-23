// Daily email job: race reminders and new-race alerts.
//
// Runs on GitHub Actions every morning (.github/workflows/notifications.yml), or by hand:
//   npm run notify            (sends)
//   npm run notify -- --dry   (shows what it would send, sends nothing)
//
// Needs these settings (GitHub: Settings → Secrets and variables → Actions → Secrets):
//   SUPABASE_URL               Supabase → Project Settings → API → Project URL
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API → service_role key. Secret: never NEXT_PUBLIC_.
//   GMAIL_USER, GMAIL_APP_PASSWORD   the same Gmail you use for sign-in codes
//   SITE_URL                   (a Variable, not a secret) e.g. https://daniel-apexdev.github.io/StrideGH
// On your computer it reads them from .env.local.
//
// Races come from data/events.seed.json, the same file the website is built from.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { alertMatches, reminderDue, reminderExpired } from "./notifications/plan.mjs";
import { alertEmail, reminderEmail } from "./notifications/emails.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dry = process.argv.includes("--dry");

// .env.local for runs on your computer (GitHub Actions passes real environment variables).
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const env = (k, ...alts) => [k, ...alts].map((x) => process.env[x]).find((v) => v && v.trim())?.trim();
const supabaseUrl = env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const site = (env("SITE_URL", "NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
const today = env("NOTIFY_TODAY") ?? new Date().toISOString().slice(0, 10); // Ghana is on UTC.

if (!supabaseUrl || !serviceKey) {
  console.log("Supabase isn't set up (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY), so there's nothing to send. Done.");
  process.exit(0);
}
const gmailUser = env("GMAIL_USER");
const gmailPass = env("GMAIL_APP_PASSWORD")?.replace(/\s+/g, "");
if (!dry && (!gmailUser || !gmailPass)) {
  console.error("✗ GMAIL_USER and GMAIL_APP_PASSWORD are needed to send emails.");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const races = JSON.parse(readFileSync(path.join(root, "data", "events.seed.json"), "utf8"));
const bySlug = new Map(races.map((r) => [r.slug, r]));
const mail = dry
  ? null
  : nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: gmailUser, pass: gmailPass } });

let sentCount = 0;
async function send(to, email, unsubscribeUrl) {
  if (dry) {
    console.log(`  would send to ${to}: ${email.subject}`);
    return true;
  }
  try {
    await mail.sendMail({
      from: `Stride GH <${gmailUser}>`,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
    });
    sentCount++;
    // Gmail allows about 500 emails a day; go gently.
    await new Promise((r) => setTimeout(r, 400));
    return true;
  } catch (e) {
    console.error(`  ✗ couldn't send to ${to}: ${e.message}`);
    return false;
  }
}

const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

console.log(`Stride GH emails for ${today}${dry ? " (dry run)" : ""}`);

// Race reminders --------------------------------------------------------------------------
const reminders = must(await db.from("race_reminders").select("id, email, race_slug, token, sent"), "reading reminders");
console.log(`Reminders: ${reminders.length} sign-ups`);
for (const r of reminders) {
  const race = bySlug.get(r.race_slug);
  if (reminderExpired(race, today)) {
    if (!dry) await db.from("race_reminders").delete().eq("id", r.id);
    continue;
  }
  const kind = reminderDue(race, r.sent ?? [], today);
  if (!kind) continue;
  const unsubscribeUrl = `${site}/unsubscribe/?t=${r.token}`;
  if (await send(r.email, reminderEmail({ kind, race, site, unsubscribeUrl }), unsubscribeUrl)) {
    if (!dry) must(await db.from("race_reminders").update({ sent: [...(r.sent ?? []), kind] }).eq("id", r.id), "saving reminder");
  }
}

// New-race alerts -------------------------------------------------------------------------
const alerts = must(await db.from("race_alerts").select("id, email, distances, cities, token"), "reading alerts");
const sentRows = must(await db.from("race_alerts_sent").select("alert_id, race_slug"), "reading sent alerts");
const sentByAlert = new Map();
for (const s of sentRows) {
  if (!sentByAlert.has(s.alert_id)) sentByAlert.set(s.alert_id, new Set());
  sentByAlert.get(s.alert_id).add(s.race_slug);
}
console.log(`Alerts: ${alerts.length} sign-ups`);
for (const a of alerts) {
  const already = sentByAlert.get(a.id) ?? new Set();
  const matches = alertMatches(a, races, already, today);
  if (!matches.length) continue;
  const unsubscribeUrl = `${site}/unsubscribe/?t=${a.token}`;
  const email = alertEmail({ races: matches.slice(0, 8), site, unsubscribeUrl, first: already.size === 0 });
  if (await send(a.email, email, unsubscribeUrl)) {
    if (!dry) {
      must(
        await db.from("race_alerts_sent").upsert(
          matches.map((m) => ({ alert_id: a.id, race_slug: m.slug })),
          { onConflict: "alert_id,race_slug" },
        ),
        "saving sent alerts",
      );
    }
  }
}

console.log(dry ? "Dry run finished." : `Done: ${sentCount} email${sentCount === 1 ? "" : "s"} sent.`);
