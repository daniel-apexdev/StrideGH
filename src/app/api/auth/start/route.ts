import { startCode, startSchema } from "@/lib/accounts/auth";
import { handle, json, preflight, readBody } from "@/lib/accounts/http";
import { clientIp, rateLimited } from "@/lib/api/rate-limit";
import { fieldErrors } from "@/lib/submissions/schema";

/**
 * POST /api/auth/start — email a 6-digit code.
 * { mode: "signup", name, email, phone: "+233 24 123 4567" } or { mode: "signin", email }
 */
export function POST(req: Request) {
  return handle(async () => {
    if (rateLimited(`auth-start:${clientIp(req)}`, 10)) return json({ error: "Too many tries from this connection. Wait a few minutes.", code: "too_many" }, 429);
    const parsed = startSchema.safeParse(await readBody(req));
    if (!parsed.success) return json({ error: "Some details need another look.", code: "invalid", fields: fieldErrors(parsed.error) }, 400);
    return json(await startCode(parsed.data));
  });
}

export const OPTIONS = preflight;
