import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AdminHeader, Flash } from "@/components/admin/admin-header";
import { StatusPill } from "@/components/admin/status-pill";
import { EventCard } from "@/components/events/event-card";
import { requireAdmin } from "@/lib/admin/auth";
import { emailConfigured } from "@/services/email";
import { formatDate, formatStartTime } from "@/lib/events/format";
import { getTakenSlugs, getToday } from "@/lib/events/repository";
import {
  checklistItems,
  includedLabels,
  organiserRoleLabels,
  raceTypeLabels,
  type ChecklistKey,
  type Submission,
} from "@/lib/submissions/schema";
import { getSubmission } from "@/lib/submissions/store";
import { submissionToEvent, suggestSlug } from "@/lib/submissions/to-event";
import { approve, reject, requestChanges, saveReview } from "../../actions";

export const metadata: Metadata = { title: "Review submission" };

const done: Record<string, string> = {
  saved: "Checklist and notes saved.",
  approved: "Approved. The race is now live on Stride GH.",
  changes_requested: "Sent back to the organiser with your note. It returns to the queue when they resubmit.",
  rejected: "Marked as not approved. The organiser sees your reason when they check their status.",
};
const errors: Record<string, string> = {
  slug: "The web address can only use lowercase letters, numbers and single dashes.",
  "slug-taken": "Another race already uses that web address. Pick a different one.",
  verification: "Choose how verified this listing is.",
  note: "Write a short note for the organiser (at least 10 characters) so they know what to fix.",
  status: "This submission has already been decided.",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5">
      <h2 className="mb-3 text-xs font-bold tracking-[0.1em] text-text2">{title.toUpperCase()}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-t border-line2 py-2.5 text-sm first:border-t-0 first:pt-0">
      <dt className="text-text2">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children ?? <span className="text-text2">Not given</span>}</dd>
    </div>
  );
}

function money(fee: number | null, free: boolean) {
  if (free) return "Free";
  if (fee === null) return <span className="text-text2">Not decided</span>;
  return `GHS ${fee.toLocaleString("en-GB")}`;
}

function Details({ s }: { s: Submission }) {
  const d = s.data;
  const r = d.registration;
  const phone = d.organiser.phone.replace(/[^\d+]/g, "");
  const wa = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("0") ? `233${phone.slice(1)}` : phone;
  return (
    <div className="flex flex-col gap-4">
      <Section title="The race">
        <dl>
          <Row label="Name">{d.race.name}</Row>
          <Row label="Type">{raceTypeLabels[d.race.type]}</Row>
          <Row label="Description">
            <span className="whitespace-pre-line font-normal leading-relaxed">{d.race.description}</span>
          </Row>
        </dl>
      </Section>

      <Section title="When and where">
        <dl>
          <Row label="Date">{formatDate.long(d.when.date)}</Row>
          <Row label="Start time">{formatStartTime(d.when.startTime)}</Row>
          <Row label="Venue">{d.when.venue}</Row>
          <Row label="Town, region">
            {d.when.city}, {d.when.region}
          </Row>
        </dl>
      </Section>

      <Section title="Distances and fees">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text2">
              <tr>
                <th className="pb-2 font-semibold">Distance</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold">Entry fee</th>
                <th className="pb-2 font-semibold">Places</th>
                <th className="pb-2 font-semibold">Cut-off</th>
              </tr>
            </thead>
            <tbody>
              {d.distances.map((x, i) => (
                <tr key={i} className="border-t border-line2">
                  <td className="py-2 font-bold">{x.label}</td>
                  <td className="py-2">{x.category}</td>
                  <td className="py-2">{money(x.fee, x.free)}</td>
                  <td className="py-2">{x.capacity?.toLocaleString("en-GB") ?? "—"}</td>
                  <td className="py-2">{x.cutoff ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What's included and who can take part">
        <dl>
          <Row label="Included">
            {d.included.length || d.includedOther
              ? [...d.included.map((k) => includedLabels[k]), ...(d.includedOther ? [d.includedOther] : [])].join(", ")
              : null}
          </Row>
          <Row label="Minimum age">{d.requirements.minAge}</Row>
          <Row label="Walkers">
            {d.requirements.walkersWelcome === null ? null : d.requirements.walkersWelcome ? "Welcome" : "Runners only"}
          </Row>
          <Row label="Other notes">{d.requirements.notes}</Row>
        </dl>
      </Section>

      <Section title="Registration">
        <dl>
          <Row label="How">
            {r.method === "url" ? "Online link" : r.method === "ussd" ? "USSD code" : r.method === "phone" ? "Call or WhatsApp" : "Not open yet"}
          </Row>
          {r.method !== "not_open" && (
            <Row label={r.method === "url" ? "Link" : "Code / number"}>
              {r.method === "url" && r.value ? (
                <a href={r.value} target="_blank" rel="noopener noreferrer nofollow" className="text-link underline">
                  {r.value}
                </a>
              ) : (
                r.value
              )}
            </Row>
          )}
          <Row label="Closes">
            {r.deadline ? `${formatDate.long(r.deadline)}${r.deadlineMayChange ? " · may change" : ""}` : null}
          </Row>
          <Row label="Poster link">
            {d.posterLink ? (
              /^https?:\/\//.test(d.posterLink) ? (
                <a href={d.posterLink} target="_blank" rel="noopener noreferrer nofollow" className="text-link underline">
                  {d.posterLink}
                </a>
              ) : (
                d.posterLink
              )
            ) : null}
          </Row>
        </dl>
      </Section>

      <Section title="Organiser">
        <dl>
          <Row label="Organisation">{d.organiser.organisation}</Row>
          <Row label="Contact">
            {d.organiser.contactName} · {organiserRoleLabels[d.organiser.role]}
          </Row>
          <Row label="Email">
            <a href={`mailto:${d.organiser.email}?subject=${encodeURIComponent(`${d.race.name} on Stride GH (${s.reference})`)}`} className="text-link underline">
              {d.organiser.email}
            </a>
          </Row>
          <Row label="Phone">
            <a href={`tel:${phone}`} className="text-link underline">
              {d.organiser.phone}
            </a>{" "}
            ·{" "}
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-link underline">
              WhatsApp
            </a>
          </Row>
          <Row label="Social / website">{d.organiser.social}</Row>
        </dl>
      </Section>

      <Section title="History">
        <ol className="flex flex-col gap-2 text-sm">
          {s.history.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-36 shrink-0 text-xs text-text2">
                {new Date(h.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} GMT
              </span>
              <span>
                <span className="font-semibold capitalize">{h.action.replace("_", " ")}</span>
                {h.note && <span className="text-text2"> — {h.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

export default async function ReviewSubmission({ params, searchParams }: PageProps<"/admin/submissions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const s = await getSubmission(id);
  if (!s) notFound();

  const [today, taken] = await Promise.all([getToday(), getTakenSlugs()]);
  const open = s.status === "pending";
  const slug = s.publishedSlug ?? suggestSlug(s.data.race.name, s.data.when.date, taken);
  const preview = submissionToEvent(s, { slug, verification: "unverified", today });
  const doneMsg = typeof sp.done === "string" ? done[sp.done] : undefined;
  const errorMsg = typeof sp.error === "string" ? errors[sp.error] : undefined;
  const ticked = Object.values(s.checklist).filter(Boolean).length;
  const total = Object.keys(checklistItems).length;

  return (
    <>
      <AdminHeader active="queue" />
      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8">
        <Link href="/admin" className="text-sm font-semibold text-link">
          ← Back to the queue
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.1em] text-text2">
              {s.reference} · SUBMITTED FROM THE {s.source === "app" ? "APP" : "WEBSITE"} ·{" "}
              {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).toUpperCase()}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none">{s.data.race.name}</h1>
          </div>
          <StatusPill status={s.status} />
        </div>
        {doneMsg && <Flash tone="ok">{doneMsg}</Flash>}
        {errorMsg && <Flash tone="warn">{errorMsg}</Flash>}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Details s={s} />

          <aside className="flex flex-col gap-4 lg:sticky lg:top-5">
            <section className="rounded-[14px] border border-line bg-surface p-5">
              <h2 className="mb-3 text-xs font-bold tracking-[0.1em] text-text2">HOW IT WILL LOOK</h2>
              <div className="pointer-events-none" aria-hidden>
                <EventCard event={preview} today={today} />
              </div>
              {s.publishedSlug && (
                <Link href={`/events/${s.publishedSlug}`} className="mt-3 inline-flex text-sm font-bold text-link underline">
                  Open the live page
                </Link>
              )}
            </section>

            <form className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5">
              <input type="hidden" name="id" value={s.id} />
              <div>
                <h2 className="text-xs font-bold tracking-[0.1em] text-text2">
                  CHECKLIST · {ticked}/{total}
                </h2>
                <p className="mt-1 text-xs text-text2">Check against the organiser&apos;s own page or social account before approving.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {(Object.keys(checklistItems) as ChecklistKey[]).map((k) => (
                  <label key={k} className="flex gap-2.5 text-sm leading-snug">
                    <input type="checkbox" name={`check_${k}`} defaultChecked={!!s.checklist[k]} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]" />
                    {checklistItems[k]}
                  </label>
                ))}
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-bold">
                Internal notes <span className="text-xs font-normal text-text2">Only admins see these.</span>
                <textarea name="internalNote" rows={3} defaultValue={s.internalNote ?? ""} className="rounded-xl border border-line bg-bg p-3 text-sm font-normal" />
              </label>
              <button formAction={saveReview} formNoValidate className="h-10 rounded-xl border border-outline text-sm font-bold">
                Save checklist and notes
              </button>

              {open ? (
                <>
                  <hr className="border-line" />
                  <h2 className="text-xs font-bold tracking-[0.1em] text-text2">DECISION</h2>
                  <label className="flex flex-col gap-1.5 text-sm font-bold">
                    Web address
                    <span className="flex items-center rounded-xl border border-line bg-bg pl-3 text-sm font-normal">
                      <span className="text-text2">/events/</span>
                      <input name="slug" defaultValue={slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className="h-10 min-w-0 flex-1 bg-transparent pr-3 font-medium" />
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-bold">
                    Badge on the listing
                    <select name="verification" defaultValue={ticked === total ? "verified" : "unverified"} className="h-10 rounded-xl border border-line bg-bg px-3 text-sm font-normal">
                      <option value="verified">Checked with official page</option>
                      <option value="unverified">Not yet verified</option>
                      <option value="details_tbc">Details to be confirmed</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-bold">
                    Note to the organiser
                    <span className="text-xs font-normal text-text2">
                      Required when asking for changes or declining.{" "}
                      {emailConfigured()
                        ? `It's emailed to ${s.data.organiser.email} and shown on their status page.`
                        : "Email isn't set up, so they only see it on their status page — contact them too."}
                    </span>
                    <textarea name="reviewerNote" rows={3} className="rounded-xl border border-line bg-bg p-3 text-sm font-normal" />
                  </label>
                  <button formAction={approve} className="h-11 rounded-xl bg-primary text-sm font-bold text-on-primary">
                    Approve and publish
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button formAction={requestChanges} formNoValidate className="h-11 rounded-xl border border-outline text-sm font-bold">
                      Ask for changes
                    </button>
                    <button formAction={reject} formNoValidate className="h-11 rounded-xl border border-danger text-sm font-bold text-danger">
                      Decline
                    </button>
                  </div>
                </>
              ) : (
                s.reviewerNote && (
                  <div className="rounded-xl bg-soft p-3 text-sm">
                    <p className="text-xs font-bold text-text2">NOTE SENT TO THE ORGANISER</p>
                    <p className="mt-1 whitespace-pre-line">{s.reviewerNote}</p>
                  </div>
                )
              )}
            </form>
          </aside>
        </div>
      </main>
    </>
  );
}
