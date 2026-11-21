import "server-only";
import { authCors } from "../api/cors";
import { EmailNotConfigured } from "@/services/email";
import { AuthError } from "./auth";

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...authCors, "Cache-Control": "no-store" } });

export const preflight = () => new Response(null, { status: 204, headers: authCors });

/** Turn known problems into friendly JSON; log anything unexpected. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.message, code: e.code, ...e.extra }, e.status);
    if (e instanceof EmailNotConfigured) return json({ error: "We can't send emails right now. Please try again later.", code: "email_unavailable" }, 503);
    console.error(e);
    return json({ error: "Something went wrong on our side. Please try again.", code: "server_error" }, 500);
  }
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}
