// Builds the public website as static files in out/, ready for GitHub Pages.
//
//   npm run build:pages                       → for a custom domain (site at the root)
//   BASE_PATH=/stride-gh npm run build:pages  → for username.github.io/stride-gh
//
// GitHub Pages can only serve files, so the parts that need a server are left out of this
// build: the admin portal, the /api routes (submissions, sign-in codes, email). The listing
// form switches to "send it by email" instead. Races and shops come from data/*.seed.json
// and images from public/, so pushing changes to those files updates the site.
//
// Works on a copy in .pages-build/ so your project folder is never changed, and never
// copies .env files: no passwords or keys end up in the published site.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const work = path.join(root, ".pages-build");

const skip = new Set(["node_modules", ".next", ".git", ".github", "out", "mobile", "tests", "coverage", ".pages-build", ".vercel"]);
const isSecret = (name) => name.startsWith(".env") && name !== ".env.example";

console.log("› Copying the project to .pages-build/");
rmSync(work, { recursive: true, force: true });
mkdirSync(work);
for (const entry of readdirSync(root)) {
  if (skip.has(entry) || isSecret(entry)) continue;
  cpSync(path.join(root, entry), path.join(work, entry), {
    recursive: true,
    filter: (src) =>
      !isSecret(path.basename(src)) &&
      path.relative(root, src) !== path.join("data", "local"), // this computer's admin data stays private
  });
}
// Reuse the installed packages instead of copying them ("junction" works on Windows without admin rights).
symlinkSync(path.join(root, "node_modules"), path.join(work, "node_modules"), "junction");

// Server-only parts. Nothing on the public pages links to them.
// /api/events and /api/stores stay: they become plain JSON files the phone app can read.
for (const p of ["src/app/admin", "src/app/api/submissions", "src/app/api/auth", "src/app/api/events/[slug]", "src/components/admin"]) {
  rmSync(path.join(work, p), { recursive: true, force: true });
}

// The app reads races and shops from these two. On Pages they're files written once per build.
writeFileSync(
  path.join(work, "src/app/api/events/route.ts"),
  `import { getAllEvents, getToday } from "@/lib/events/repository";
export const dynamic = "force-static";
export async function GET() {
  const [events, today] = await Promise.all([getAllEvents(), getToday()]);
  return Response.json({ today, events });
}
`,
);
writeFileSync(
  path.join(work, "src/app/api/stores/route.ts"),
  `import { getStores } from "@/lib/stores/repository";
export const dynamic = "force-static";
export async function GET() {
  return Response.json({ stores: await getStores() });
}
`,
);

console.log(`› Building the static site${process.env.BASE_PATH ? ` for ${process.env.BASE_PATH}` : ""}`);
const next = path.join(root, "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [next, "build"], {
  cwd: work,
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1", NEXT_TELEMETRY_DISABLED: "1" },
});
if (result.status !== 0) process.exit(result.status ?? 1);

const out = path.join(root, "out");
rmSync(out, { recursive: true, force: true });
cpSync(path.join(work, "out"), out, { recursive: true });
// GitHub Pages runs Jekyll by default, which hides folders starting with "_" (like _next/).
writeFileSync(path.join(out, ".nojekyll"), "");

rmSync(work, { recursive: true, force: true });
console.log(`✓ Static site ready in out/${existsSync(path.join(out, "index.html")) ? "" : " (index.html missing!)"}`);
