import "server-only";
import { emailConfigured, notify, submissionDecisionEmail, submissionReceivedEmail, type SubmissionSummary } from "@/services/email";
import { formatDate } from "../events/format";
import type { Submission } from "./schema";
import { updateSubmission } from "./store";

/** Emails to organisers about their submission. Never throw: the submission itself already succeeded. */

function summary(s: Submission): SubmissionSummary {
  const d = s.data;
  return {
    reference: s.reference,
    raceName: d.race.name,
    raceDate: formatDate.long(d.when.date),
    place: `${d.when.venue}, ${d.when.city}`,
    contactName: d.organiser.contactName,
    email: d.organiser.email,
  };
}

/** Note in the submission's history that an email went (or didn't), so the admin can see it. */
async function log(s: Submission, what: string, sent: boolean) {
  await updateSubmission(s.id, (x) => {
    const note = !emailConfigured()
      ? `Email not set up, so the organiser wasn't emailed (${what})`
      : sent
        ? `Emailed organiser: ${what}`
        : `Email to organiser failed: ${what} — contact them directly`;
    x.history.push({ at: new Date().toISOString(), action: "note", note });
  }).catch(() => {});
}

export async function emailReceived(s: Submission, resubmitted = false) {
  const sum = summary(s);
  const sent = await notify({ to: sum.email, ...submissionReceivedEmail(sum, { resubmitted }) });
  await log(s, resubmitted ? "changes received" : "race received", sent);
}

export async function emailDecision(s: Submission) {
  const sum = summary(s);
  const mail =
    s.status === "approved" && s.publishedSlug
      ? submissionDecisionEmail(sum, { kind: "approved", slug: s.publishedSlug, note: s.reviewerNote })
      : s.status === "changes_requested"
        ? submissionDecisionEmail(sum, { kind: "changes_requested", note: s.reviewerNote ?? "" })
        : s.status === "rejected"
          ? submissionDecisionEmail(sum, { kind: "rejected", note: s.reviewerNote ?? "" })
          : null;
  if (!mail) return;
  const sent = await notify({ to: sum.email, ...mail });
  await log(s, s.status === "approved" ? "race is live" : s.status === "rejected" ? "not approved" : "changes needed", sent);
}
