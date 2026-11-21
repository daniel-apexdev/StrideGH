import { corsHeaders, preflight } from "@/lib/api/cors";
import { getEventBySlug, getToday } from "@/lib/events/repository";

/** GET /api/events/:slug — one race, or 404. */
export async function GET(_request: Request, ctx: RouteContext<"/api/events/[slug]">) {
  const { slug } = await ctx.params;
  const [event, today] = await Promise.all([getEventBySlug(slug), getToday()]);
  if (!event) {
    return Response.json({ error: "Race not found" }, { status: 404, headers: corsHeaders });
  }
  return Response.json({ today, event }, { headers: corsHeaders });
}

export const OPTIONS = preflight;
