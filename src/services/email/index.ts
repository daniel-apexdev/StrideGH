import "server-only";
import { deliver, type Email } from "./transport";

export { EmailNotConfigured, emailConfigured, emailDevMode, emailProvider, verifyTransport, type Email } from "./transport";
export { signInCodeEmail } from "./templates/sign-in-code";
export { submissionReceivedEmail, statusLink, type SubmissionSummary } from "./templates/submission-received";
export { submissionDecisionEmail } from "./templates/submission-decision";

/** Send an email now. Throws if it can't be sent (use for things the person is waiting on, like codes). */
export async function sendEmail(mail: Email): Promise<void> {
  await deliver(mail);
}

/**
 * Send a courtesy email (confirmations, status updates). A failure is logged, never shown to the person,
 * and never undoes what they just did. Returns whether it went.
 */
export async function notify(mail: Email): Promise<boolean> {
  try {
    await deliver(mail);
    return true;
  } catch (e) {
    console.error(`[email] Couldn't send "${mail.subject}" to ${mail.to}:`, e instanceof Error ? e.message : e);
    return false;
  }
}
