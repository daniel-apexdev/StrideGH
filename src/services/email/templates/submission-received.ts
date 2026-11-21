import { button, details, firstName, layout, p, panel, plain, siteUrl } from "../layout";

export type SubmissionSummary = {
  reference: string;
  raceName: string;
  /** Already formatted, e.g. "Saturday 19 December 2026" */
  raceDate: string;
  place: string;
  contactName: string;
  email: string;
};

export const statusLink = (s: Pick<SubmissionSummary, "reference" | "email">) =>
  `${siteUrl()}/list/status?ref=${encodeURIComponent(s.reference)}&email=${encodeURIComponent(s.email)}`;

/** Sent when an organiser submits a race, or sends it back after changes were requested. */
export function submissionReceivedEmail(s: SubmissionSummary, opts: { resubmitted?: boolean } = {}) {
  const hello = `Hi ${firstName(s.contactName) ?? "there"},`;
  const lead = opts.resubmitted
    ? `Thanks for updating ${s.raceName}. It's back in our review queue.`
    : `Thanks for listing ${s.raceName} on Stride GH. We've got it.`;
  const next =
    "We'll check the details against your official page or social account, usually within 2 working days. Approved races appear on the app and website straight away.";
  return {
    subject: opts.resubmitted ? `We've got your changes — ${s.raceName} (${s.reference})` : `We've got your race — ${s.raceName} (${s.reference})`,
    html: layout({
      preheader: `Reference ${s.reference}. We'll review it within about 2 working days.`,
      title: opts.resubmitted ? "Changes received" : "Race received",
      body:
        p(`${hello}\n\n${lead}`) +
        panel(
          details([
            ["Reference", s.reference],
            ["Race", s.raceName],
            ["Date", s.raceDate],
            ["Where", s.place],
          ]),
        ) +
        p(next) +
        button("Check your status", statusLink(s)),
      footnote: `Keep your reference (${s.reference}) — you'll need it with this email address to check progress.`,
    }),
    text: plain([
      hello,
      "",
      lead,
      "",
      `Reference: ${s.reference}`,
      `Race: ${s.raceName}`,
      `Date: ${s.raceDate}`,
      `Where: ${s.place}`,
      "",
      next,
      "",
      `Check your status: ${statusLink(s)}`,
    ]),
  };
}

