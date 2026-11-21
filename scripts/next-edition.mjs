// Copies a race to a new year, ready to fill in when the organiser announces it.
//
//   npm run race:next -- final-lap-2026 2027-12-18
//
// Adds "final-lap-2027" to data/events.seed.json with the new date and everything that
// usually changes each year cleared: poster and photos, prices, registration link, and the
// "checked" status. Venue, organiser, distances and description are kept for you to check.
// The 2026 page then shows "Next edition: …" automatically.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [from, date] = process.argv.slice(2);
const file = path.resolve(import.meta.dirname, "..", "data", "events.seed.json");

function fail(msg) {
  console.error(`✗ ${msg}`);
  console.error("  Usage: npm run race:next -- <race-slug> <YYYY-MM-DD>   e.g. npm run race:next -- final-lap-2026 2027-12-18");
  process.exit(1);
}

if (!from || !date) fail("Give the race to copy and the new date.");
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) fail(`"${date}" isn't a date like 2027-12-18.`);

const text = readFileSync(file, "utf8");
const events = JSON.parse(text);
const old = events.find((e) => e.slug === from);
if (!old) fail(`No race with slug "${from}" in data/events.seed.json.`);
if (date <= old.date) fail(`The new date must be after ${old.date}.`);

const year = date.slice(0, 4);
const oldYear = old.date.slice(0, 4);
const slug = `${from.replace(/-(19|20)\d{2}$/, "")}-${year}`;
if (events.some((e) => e.slug === slug)) fail(`"${slug}" is already listed.`);

const next = {
  ...structuredClone(old),
  slug,
  name: old.name.includes(oldYear) ? old.name.replaceAll(oldYear, year) : old.name,
  date,
  feeSummary: null,
  feeKind: "unconfirmed",
  registration: { method: "none", url: null, note: "Registration isn't open yet. We'll add the link when the organiser publishes it." },
  verification: "details_tbc",
  verifiedAt: null,
  poster: null,
  distances: old.distances.map((d) => ({ ...d, priceMinor: null, note: null })),
};
delete next.gallery;
// Last year's highlights often mention prices or medals that change, so keep only ones without numbers.
next.highlights = (old.highlights ?? []).filter((h) => !/\d/.test(h));

// Append without reformatting the rest of the file.
const block = JSON.stringify(next, null, 2).replace(/^/gm, "  ");
const out = text.replace(/\n\]\s*$/, `,\n${block}\n]\n`);
if (out === text) fail("Couldn't find the end of data/events.seed.json. Is it still a JSON list?");
writeFileSync(file, out);

console.log(`✓ Added ${slug} (${next.name}) on ${date}.`);
console.log("  Next: open data/events.seed.json, check the venue, distances and start time,");
console.log("  then add the poster, prices and registration link when the organiser publishes them.");
console.log("  Run npm test to check it, then commit and push.");
