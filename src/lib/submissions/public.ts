import { statusLabels, type Submission } from "./schema";

/**
 * What an organiser sees about their own submission. Never includes internal notes or the checklist.
 */
export function publicView(s: Submission) {
  return {
    reference: s.reference,
    status: s.status,
    statusLabel: statusLabels[s.status],
    submittedAt: s.createdAt,
    updatedAt: s.updatedAt,
    raceName: s.data.race.name,
    raceDate: s.data.when.date,
    reviewerNote: s.reviewerNote,
    publishedSlug: s.publishedSlug,
    /** Returned only while changes are requested, so the form can be reopened with their answers. */
    data: s.status === "changes_requested" ? s.data : null,
  };
}
export type PublicSubmission = ReturnType<typeof publicView>;

export function emailMatches(s: Submission, email: string | null): boolean {
  return !!email && s.data.organiser.email.toLowerCase() === email.trim().toLowerCase();
}
