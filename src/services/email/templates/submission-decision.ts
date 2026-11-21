import { button, firstName, layout, p, panel, plain, siteUrl } from "../layout";
import { statusLink, type SubmissionSummary } from "./submission-received";

type Decision = { kind: "approved"; slug: string; note: string | null } | { kind: "changes_requested"; note: string } | { kind: "rejected"; note: string };

/** Sent when the review team approves, asks for changes, or declines a race. */
export function submissionDecisionEmail(s: SubmissionSummary, d: Decision) {
  const hello = `Hi ${firstName(s.contactName) ?? "there"},`;

  if (d.kind === "approved") {
    const url = `${siteUrl()}/events/${d.slug}`;
    const lead = `Good news: ${s.raceName} is now live on Stride GH. Runners can find it in the app and on the website, and the registration button sends them to you.`;
    const after = "If anything changes — date, venue, fees or registration — reply to this email so we can keep the listing right.";
    return {
      subject: `${s.raceName} is live on Stride GH`,
      html: layout({
        preheader: "Your race is approved and live.",
        title: "Your race is live",
        body:
          p(`${hello}\n\n${lead}`) +
          (d.note ? panel(p(d.note, "margin:0"), "Note from the Stride GH team") : "") +
          button("See your race", url) +
          p(after),
        footnote: `Reference ${s.reference}. Share the link with your runners: ${url}`,
      }),
      text: plain([hello, "", lead, ...(d.note ? ["", `Note from the Stride GH team: ${d.note}`] : []), "", `See your race: ${url}`, "", after]),
    };
  }

  if (d.kind === "changes_requested") {
    const lead = `We've looked at ${s.raceName} and need a few changes before it can go live.`;
    const how = "Open your status page, tap “Edit and resubmit”, update the details and send it back. It returns to the front of our queue.";
    return {
      subject: `Changes needed for ${s.raceName} (${s.reference})`,
      html: layout({
        preheader: "A few changes are needed before your race goes live.",
        title: "A few changes needed",
        body: p(`${hello}\n\n${lead}`) + panel(p(d.note, "margin:0"), "What to change") + p(how) + button("Edit your race", statusLink(s)),
        footnote: `Reference ${s.reference}. Questions? Just reply to this email.`,
      }),
      text: plain([hello, "", lead, "", "What to change:", d.note, "", how, "", `Edit your race: ${statusLink(s)}`]),
    };
  }

  const lead = `Thanks for submitting ${s.raceName}. We weren't able to list it on Stride GH this time.`;
  const after = "If you think we've got something wrong, or the details change, reply to this email or submit the race again.";
  return {
    subject: `About your race: ${s.raceName} (${s.reference})`,
    html: layout({
      preheader: "We couldn't list your race this time.",
      title: "We couldn't list this race",
      body: p(`${hello}\n\n${lead}`) + panel(p(d.note, "margin:0"), "Why") + p(after),
      footnote: `Reference ${s.reference}.`,
    }),
    text: plain([hello, "", lead, "", `Why: ${d.note}`, "", after]),
  };
}
