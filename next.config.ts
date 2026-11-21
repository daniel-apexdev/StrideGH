import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 builds a static copy of the public site into out/ for GitHub Pages
 * (npm run build:pages, or the workflow in .github/workflows/deploy-pages.yml).
 * BASE_PATH is the sub-folder it is served from, e.g. "/stride-gh" for username.github.io/stride-gh.
 */
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = (process.env.BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Lets phones and tablets on your home Wi-Fi load the dev server (e.g. http://192.168.1.23:3000).
  // Only affects `npm run dev`; production is unaffected.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  images: isStatic
    ? { loader: "custom", loaderFile: "./src/lib/image-loader.ts" }
    : {
        // Posters uploaded to Supabase Storage (Stage 3). Local files in /public/posters need no entry.
        remotePatterns: [
          { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
          // Free sample product photos for the demo shops (Unsplash License). Replace with the shops' own photos.
          { protocol: "https", hostname: "images.unsplash.com" },
        ],
      },
  ...(isStatic && {
    output: "export",
    trailingSlash: true,
    basePath: basePath || undefined,
    env: { NEXT_PUBLIC_STATIC_EXPORT: "1", NEXT_PUBLIC_BASE_PATH: basePath },
  }),
  // Static export can't do partial prerendering, so the Pages build keeps only "use cache".
  ...(isStatic ? { experimental: { useCache: true } } : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
