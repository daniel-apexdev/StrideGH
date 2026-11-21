import { corsHeaders } from "@/lib/api/cors";
import { getStores } from "@/lib/stores/repository";

/** GET /api/stores — every shop with its products, for the app. */
export async function GET() {
  return Response.json({ stores: await getStores() }, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
