import { after } from "next/server";
import { submissionCors } from "@/lib/api/cors";
import { emailReceived } from "@/lib/submissions/emails";
import { clientIp, rateLimited } from "@/lib/api/rate-limit";
import { fieldErrors, submissionInputSchema } from "@/lib/submissions/schema";
import { publicView } from "@/lib/submissions/public";
import { createSubmission } from "@/lib/submissions/store";


const json = (body: unknown, status = 200) => Response.json(body, { status, headers: submissionCors });

/**
 * POST /api/submissions — an organiser lists a race (from the app or the /list form).
 * Body: { source: "app" | "web", website?: "" (honeypot, must stay empty), ...SubmissionInput }
 * 201 → { submission: { reference, status, ... } } · 400 → { error, fields } · 429 → too many tries
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send the form as JSON." }, 400);
  }
  // Bots fill every field; people never see this one.
  if (typeof body.website === "string" && body.website.length > 0) return json({ error: "Could not submit." }, 400);
  if (rateLimited(`submit:${clientIp(req)}`)) {
    return json({ error: "Too many submissions from this connection. Please try again in a few minutes." }, 429);
  }
  const parsed = submissionInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Some details need another look.", fields: fieldErrors(parsed.error) }, 400);
  }
  const source = body.source === "app" ? "app" : "web";
  const submission = await createSubmission(parsed.data, source);
  // Confirmation email goes after the response, so a slow mail server never holds up the organiser.
  after(() => emailReceived(submission));
  return json({ submission: publicView(submission) }, 201);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: submissionCors });
}
