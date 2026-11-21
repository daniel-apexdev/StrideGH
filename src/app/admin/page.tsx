import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusPill } from "@/components/admin/status-pill";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate } from "@/lib/events/format";
import { raceTypeLabels, statusLabels, submissionStatuses, type SubmissionStatus } from "@/lib/submissions/schema";
import { listSubmissions } from "@/lib/submissions/store";

export const metadata: Metadata = { title: "Review queue" };

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} days ago`;
}

export default async function AdminQueue({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const { status: raw } = await searchParams;
  const status: SubmissionStatus = submissionStatuses.includes(raw as SubmissionStatus) ? (raw as SubmissionStatus) : "pending";
  const all = await listSubmissions();
  const counts = Object.fromEntries(submissionStatuses.map((s) => [s, all.filter((x) => x.status === s).length]));
  // Oldest first while waiting, so nobody waits longest; newest first for decided ones.
  const shown = all.filter((s) => s.status === status);
  if (status === "pending") shown.reverse();

  return (
    <>
      <AdminHeader active="queue" />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Review queue</h1>
            <p className="mt-1.5 text-sm text-text2">
              Races organisers submitted from the app and the website. Only approved races appear on Stride GH.
            </p>
          </div>
        </div>

        <nav aria-label="Filter by status" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {submissionStatuses.map((s) => (
            <Link
              key={s}
              href={s === "pending" ? "/admin" : `/admin?status=${s}`}
              aria-current={s === status ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${
                s === status ? "border-sel bg-sel text-on-sel" : "border-line bg-surface"
              }`}
            >
              {statusLabels[s]}
              <span className={`rounded-full px-1.5 text-xs ${s === status ? "bg-on-sel/20" : "bg-soft"}`}>{counts[s]}</span>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-dash p-10 text-center">
            <p className="font-display text-2xl font-extrabold uppercase">Nothing here</p>
            <p className="mt-1 text-sm text-text2">
              {status === "pending"
                ? "No races are waiting for review. New submissions from the app and /list show up here."
                : `No submissions are “${statusLabels[status].toLowerCase()}”.`}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shown.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/submissions/${s.id}`}
                  className="grid gap-x-6 gap-y-1.5 rounded-[14px] border border-line bg-surface p-4 hover:border-outline md:grid-cols-[1fr_200px_170px] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-link">
                      {formatDate.short(s.data.when.date)} · {s.data.when.city} · {raceTypeLabels[s.data.race.type]}
                    </p>
                    <p className="truncate font-display text-2xl font-bold leading-tight">{s.data.race.name}</p>
                    <p className="text-xs text-text2">
                      {s.data.distances.map((d) => d.label).join(" · ")} — by {s.data.organiser.organisation}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">{s.data.organiser.contactName}</p>
                    <p className="truncate text-xs text-text2">{s.data.organiser.email}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                    <StatusPill status={s.status} />
                    <span className="text-xs text-text2">
                      {s.reference} · {s.source === "app" ? "App" : "Web"} · {ago(s.updatedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
