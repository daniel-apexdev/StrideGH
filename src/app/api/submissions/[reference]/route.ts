import { after } from "next/server";
import { submissionCors } from "@/lib/api/cors";
import { emailReceived } from "@/lib/submissions/emails";
import { clientIp, rateLimited } from "@/lib/api/rate-limit";
import { fieldErrors, submissionInputSchema } from "@/lib/submissions/schema";
import { emailMatches, publicView } from "@/lib/submissions/public";
import { getSubmissionByReference, updateSubmission } from "@/lib/submissions/store";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: submissionCors });
const notFound = () => json({ error: "We couldn't find a submission with that reference and email." }, 404);

/** GET /api/submissions/SGH-XXXXXX?email=… — an organiser checks their status. */
export async function GET(req: Request, ctx: RouteContext<"/api/submissions/[reference]">) {
  const { reference } = await ctx.params;
  const email = new URL(req.url).searchParams.get("email");
  if (rateLimited(`status:${clientIp(req)}`, 30)) return json({ error: "Too many lookups. Try again shortly." }, 429);
  const sub = await getSubmissionByReference(reference);
  if (!sub || !emailMatches(sub, email)) return notFound();
  return json({ submission: publicView(sub) });
}

/**
 * PUT /api/submissions/SGH-XXXXXX — resubmit after the review team asked for changes.
 * Body: the full form again, with the same organiser email. Sends it back to the review queue.
 */
export async function PUT(req: Request, ctx: RouteContext<"/api/submissions/[reference]">) {
  const { reference } = await ctx.params;
  if (rateLimited(`submit:${clientIp(req)}`)) return json({ error: "Too many tries. Please wait a few minutes." }, 429);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Send the form as JSON." }, 400);
  }
  const parsed = submissionInputSchema.safeParse(body);
  if (!parsed.success) return json({ error: "Some details need another look.", fields: fieldErrors(parsed.error) }, 400);
  const sub = await getSubmissionByReference(reference);
  if (!sub || !emailMatches(sub, parsed.data.organiser.email)) return notFound();
  if (sub.status !== "changes_requested") {
    return json({ error: "This submission isn't waiting for changes, so it can't be edited right now." }, 409);
  }
  const updated = await updateSubmission(sub.id, (s) => {
    s.data = parsed.data;
    s.status = "pending";
    s.history.push({ at: new Date().toISOString(), action: "submitted", note: "Resubmitted with changes" });
  });
  after(() => emailReceived(updated, true));
  return json({ submission: publicView(updated) });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: submissionCors });
}
