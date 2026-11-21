import { corsHeaders, preflight } from "@/lib/api/cors";
import { getAllEvents, getToday } from "@/lib/events/repository";

/**
 * GET /api/events — every published race (past and upcoming) plus today's date in Ghana,
 * so clients work out countdowns and "past race" the same way the website does.
 * Used by the mobile app in /mobile.
 */
export async function GET() {
  const [events, today] = await Promise.all([getAllEvents(), getToday()]);
  return Response.json({ today, events }, { headers: corsHeaders });
}

export const OPTIONS = preflight;
