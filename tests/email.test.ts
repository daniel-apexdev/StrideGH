import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn(async () => ({ messageId: "x" }));
const createTransport = vi.fn(() => ({ sendMail, verify: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const summary = {
  reference: "SGH-7KQ2MP",
  raceName: "Labadi <Beach> 10K",
  raceDate: "Sat, 19 December 2026",
  place: "Labadi Beach Hotel, Accra",
  contactName: "Ama Mensah",
  email: "ama@example.com",
};

describe("email templates", () => {
  it("builds every email with a subject, escaped HTML and a plain-text version", async () => {
    vi.stubEnv("SITE_URL", "https://stride.example");
    const e = await import("@/services/email");
    const mails = {
      "sign-in-code": e.signInCodeEmail({ code: "482913", name: "Ama Mensah", purpose: "signup", minutes: 10 }),
      received: e.submissionReceivedEmail(summary),
      resubmitted: e.submissionReceivedEmail(summary, { resubmitted: true }),
      approved: e.submissionDecisionEmail(summary, { kind: "approved", slug: "labadi-beach-10k-2026", note: null }),
      changes: e.submissionDecisionEmail(summary, { kind: "changes_requested", note: "Please add the exact start line." }),
      declined: e.submissionDecisionEmail(summary, { kind: "rejected", note: "This is a private club run." }),
    };
    for (const m of Object.values(mails)) {
      expect(m.subject.length).toBeGreaterThan(5);
      expect(m.html).not.toContain("<Beach>");
      expect(m.text).toContain("Stride GH");
    }
    expect(mails["sign-in-code"].subject).toBe("482913 is your Stride GH code");
    expect(mails.received.html).toContain("https://stride.example/list/status?ref=SGH-7KQ2MP&amp;email=ama%40example.com");
    expect(mails.approved.text).toContain("https://stride.example/events/labadi-beach-10k-2026");
    expect(mails.changes.text).toContain("Please add the exact start line.");

    // EMAIL_PREVIEW_DIR=/some/folder npm test -- email   → open the .html files in a browser
    const dir = process.env.EMAIL_PREVIEW_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      for (const [name, m] of Object.entries(mails)) writeFileSync(path.join(dir, `${name}.html`), m.html);
    }
  });
});

describe("sending", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    sendMail.mockClear();
  });

  it("uses Gmail when GMAIL_USER and GMAIL_APP_PASSWORD are set", async () => {
    vi.stubEnv("GMAIL_USER", "stride.gh@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcd efgh ijkl mnop");
    const e = await import("@/services/email");
    expect(e.emailProvider()).toBe("gmail");
    await e.sendEmail({ to: "ama@example.com", subject: "Hi", text: "t", html: "<p>h</p>" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.gmail.com", auth: { user: "stride.gh@gmail.com", pass: "abcdefghijklmnop" } }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: { name: "Stride GH", address: "stride.gh@gmail.com" }, to: "ama@example.com" }));
  });

  it("never throws from notify()", async () => {
    vi.stubEnv("GMAIL_USER", "stride.gh@gmail.com");
    vi.stubEnv("GMAIL_APP_PASSWORD", "abcdefghijklmnop");
    sendMail.mockRejectedValueOnce(new Error("SMTP down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const e = await import("@/services/email");
    expect(await e.notify({ to: "a@b.co", subject: "s", text: "t", html: "h" })).toBe(false);
    err.mockRestore();
  });
});
