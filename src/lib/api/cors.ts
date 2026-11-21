/**
 * The race API is public, read-only data, so any origin may read it.
 * This lets the Expo app's web preview (a different port) call it during development.
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Organisers submit from the app (and its web preview), so the submissions API also accepts POST/PUT. */
export const submissionCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Account endpoints take a Bearer token from the app. */
export const authCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
