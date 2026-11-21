import { signOut } from "@/lib/accounts/auth";
import { handle, json, preflight } from "@/lib/accounts/http";

/** POST /api/auth/signout — ends this device's session. */
export function POST(req: Request) {
  return handle(async () => {
    await signOut(req);
    return json({ ok: true });
  });
}

export const OPTIONS = preflight;
