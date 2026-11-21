// Adds an image you've saved in public/posters/ to a race, filling in its size for you.
//
//   npm run race:image -- <race-slug> <file> "<description>"
//   npm run race:image -- gold-coast-run-2026 public/posters/gold-coast-run-2026.webp "Runner in a Gold Coast Run T-shirt, arms out"
//
// The first image a race gets becomes its poster (shown at the top of the race page); later
// ones go into "Photos & flyers". Add --poster to make an image the poster (the old poster
// moves into the photos), or --gallery to always add to the photos.
// Works with .jpg, .png and .webp files.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [slug, file, ...rest] = args.filter((a) => !a.startsWith("--"));
const alt = rest.join(" ").trim();

function fail(msg) {
  console.error(`✗ ${msg}`);
  console.error('  Usage: npm run race:image -- <race-slug> public/posters/<file> "<what the image shows>"');
  process.exit(1);
}
if (!slug || !file) fail("Give the race and the image file.");
if (alt.length < 5) fail("Add a short description of what the image shows (for screen readers and slow connections).");

const abs = path.resolve(root, file);
const publicDir = path.join(root, "public");
if (!abs.startsWith(publicDir + path.sep)) fail("Put the image inside the public folder first, e.g. public/posters/.");
if (!existsSync(abs)) fail(`Can't find ${file}.`);

/** Width and height from the file itself (JPEG, PNG or WebP). */
function size(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const kind = buf.toString("ascii", 12, 16);
    if (kind === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
    if (kind === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

const dims = size(readFileSync(abs));
if (!dims) fail(`${file} isn't a JPEG, PNG or WebP image. If you saved it from a browser, check the real file type.`);

const src = "/" + path.relative(publicDir, abs).split(path.sep).join("/");
const image = { src, width: dims.width, height: dims.height, alt };

const seed = path.join(root, "data", "events.seed.json");
const text = readFileSync(seed, "utf8");
const events = JSON.parse(text);
const race = events.find((e) => e.slug === slug);
if (!race) fail(`No race with slug "${slug}" in data/events.seed.json.`);
if (race.poster?.src === src || race.gallery?.some((g) => g.src === src)) fail(`${src} is already on ${slug}.`);

let where;
if (flags.has("--gallery") || (race.poster && !flags.has("--poster"))) {
  race.gallery = [...(race.gallery ?? []), image];
  where = "Photos & flyers";
} else {
  if (race.poster) race.gallery = [race.poster, ...(race.gallery ?? [])];
  race.poster = image;
  where = "the poster";
}

// Rewrite only this race's entry, so the rest of the file keeps its layout.
const at = text.indexOf(`"slug": "${slug}"`);
const start = text.lastIndexOf("\n  {", at) + 1;
let depth = 0, end = start, inStr = false, esc = false;
for (; end < text.length; end++) {
  const ch = text[end];
  if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
  if (ch === '"') inStr = true;
  else if (ch === "{") depth++;
  else if (ch === "}" && --depth === 0) { end++; break; }
}
const block = "  " + JSON.stringify(race, null, 2).replace(/\n/g, "\n  ");
writeFileSync(seed, text.slice(0, start) + block + text.slice(end));

console.log(`✓ Added ${src} (${dims.width}×${dims.height}) to ${slug} as ${where}.`);
console.log("  Run npm test, then commit and push.");
