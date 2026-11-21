import { verifyCode } from "@/lib/accounts/auth";
import { handle, json, preflight, readBody } from "@/lib/accounts/http";
import { clientIp, rateLimited } from "@/lib/api/rate-limit";

/** POST /api/auth/verify — { email, code } → { token, user }. Keep the token; send it as "Authorization: Bearer …". */
export function POST(req: Request) {
  return handle(async () => {
    if (rateLimited(`auth-verify:${clientIp(req)}`, 20)) return json({ error: "Too many tries. Wait a few minutes.", code: "too_many" }, 429);
    const body = await readBody(req);
    if (typeof body.email !== "string" || typeof body.code !== "string") return json({ error: "Enter the 6-digit code.", code: "invalid" }, 400);
    return json(await verifyCode(body.email, body.code));
  });
}

export const OPTIONS = preflight;
