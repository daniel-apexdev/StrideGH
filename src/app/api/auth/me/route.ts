import { publicUser, userFromRequest } from "@/lib/accounts/auth";
import { handle, json, preflight } from "@/lib/accounts/http";

/** GET /api/auth/me — the signed-in account, or 401. */
export function GET(req: Request) {
  return handle(async () => {
    const user = await userFromRequest(req);
    return user ? json({ user: publicUser(user) }) : json({ error: "You're signed out.", code: "signed_out" }, 401);
  });
}

export const OPTIONS = preflight;
