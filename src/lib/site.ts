/** Working name — change it here when the brand is decided. */
export const siteConfig = {
  name: "Stride GH",
  description: "Find road races across Ghana and running gear from local shops.",
  /** Ghana runs on GMT all year, so UTC dates match local dates. */
  timeZone: "Africa/Accra",
};

/**
 * Where the website is running. On GitHub Pages it is a static copy with no server, so
 * forms that need one (listing a race, status checks, the admin portal) fall back to email.
 * Set by next.config.ts when STATIC_EXPORT=1 (see scripts/build-pages.mjs).
 */
export const isStaticSite = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** "/stride-gh" when the site lives at username.github.io/stride-gh; "" on its own domain. */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Where organisers send race details on the static site (GitHub repo variable CONTACT_EMAIL). */
export const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "";

/**
 * Adds the base path to a site-relative link that doesn't go through next/link,
 * e.g. a poster's "open full size" link or a plain <form action>. Full URLs are left alone.
 */
export function withBase(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${basePath}${path}` : path;
}
