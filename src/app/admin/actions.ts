"use server";

import { cookies } from "next/headers";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { ADMIN_COOKIE, newSessionToken, passwordMatches, requireAdmin } from "@/lib/admin/auth";
import { clientIpFromHeaders } from "@/lib/admin/ip";
import { rateLimited } from "@/lib/api/rate-limit";
import { getTakenSlugs, getToday } from "@/lib/events/repository";
import { verificationStates, type RaceEvent } from "@/lib/events/types";
import { emailDecision } from "@/lib/submissions/emails";
import { checklistItems, type ChecklistKey } from "@/lib/submissions/schema";
import { getSubmission, publishEvent, setListingStatus, setListingVerification, updateSubmission } from "@/lib/submissions/store";
import { submissionToEvent } from "@/lib/submissions/to-event";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const now = () => new Date().toISOString();

// ------------------------------------------------------------ sign in / out

export async function login(form: FormData) {
  if (rateLimited(`login:${await clientIpFromHeaders()}`, 8, 15 * 60_000)) redirect("/admin/login?error=wait");
  if (!passwordMatches(str(form, "password"))) redirect("/admin/login?error=wrong");
  const { token, expires } = newSessionToken();
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ------------------------------------------------------------ reviewing a submission

function readChecklist(form: FormData) {
  return Object.fromEntries((Object.keys(checklistItems) as ChecklistKey[]).map((k) => [k, form.get(`check_${k}`) === "on"]));
}

/** Save the checklist and internal notes without changing the status. */
export async function saveReview(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  await updateSubmission(id, (s) => {
    s.checklist = readChecklist(form);
    s.internalNote = str(form, "internalNote") || null;
  });
  redirect(`/admin/submissions/${id}?done=saved`);
}

export async function approve(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const slug = str(form, "slug");
  const verification = str(form, "verification") as RaceEvent["verification"];
  const back = (error: string) => redirect(`/admin/submissions/${id}?error=${error}`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 70) back("slug");
  if (!verificationStates.includes(verification)) back("verification");
  const sub = await getSubmission(id);
  if (!sub) redirect("/admin");
  if (sub.status !== "pending") back("status");
  if ((await getTakenSlugs()).includes(slug)) back("slug-taken");

  const today = await getToday();
  const event = submissionToEvent(sub, { slug, verification, today });
  await publishEvent(event);
  const approved = await updateSubmission(id, (s) => {
    s.status = "approved";
    s.publishedSlug = slug;
    s.checklist = readChecklist(form);
    s.internalNote = str(form, "internalNote") || s.internalNote;
    s.reviewerNote = str(form, "reviewerNote") || null;
    s.history.push({ at: now(), action: "approved", note: `Published as /events/${slug} (${verification})` });
  });
  // Refresh the public race list straight away, then tell the organiser.
  updateTag("events");
  after(() => emailDecision(approved));
  redirect(`/admin/submissions/${id}?done=approved`);
}

async function decide(form: FormData, status: "changes_requested" | "rejected") {
  await requireAdmin();
  const id = str(form, "id");
  const note = str(form, "reviewerNote");
  if (note.length < 10) redirect(`/admin/submissions/${id}?error=note`);
  const sub = await getSubmission(id);
  if (!sub) redirect("/admin");
  if (sub.status !== "pending") redirect(`/admin/submissions/${id}?error=status`);
  const decided = await updateSubmission(id, (s) => {
    s.status = status;
    s.reviewerNote = note;
    s.checklist = readChecklist(form);
    s.internalNote = str(form, "internalNote") || s.internalNote;
    s.history.push({ at: now(), action: status, note });
  });
  after(() => emailDecision(decided));
  redirect(`/admin/submissions/${id}?done=${status}`);
}

export async function requestChanges(form: FormData) {
  await decide(form, "changes_requested");
}

export async function reject(form: FormData) {
  await decide(form, "rejected");
}

// ------------------------------------------------------------ live listings

export async function changeListingStatus(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const status = str(form, "status") === "archived" ? "archived" : "published";
  await setListingStatus(slug, status);
  updateTag("events");
  redirect(`/admin/listings?done=${status}#${slug}`);
}

export async function changeListingVerification(form: FormData) {
  await requireAdmin();
  const slug = str(form, "slug");
  const verification = str(form, "verification") as RaceEvent["verification"];
  if (!verificationStates.includes(verification)) redirect("/admin/listings");
  await setListingVerification(slug, verification, await getToday());
  updateTag("events");
  redirect(`/admin/listings?done=verification#${slug}`);
}
