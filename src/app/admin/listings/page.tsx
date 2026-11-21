import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, Flash } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/admin/auth";
import { formatDate, isPast, locationLabel } from "@/lib/events/format";
import { getAdminListings, getToday } from "@/lib/events/repository";
import { changeListingStatus, changeListingVerification } from "../actions";

export const metadata: Metadata = { title: "Live listings" };

const done: Record<string, string> = {
  archived: "Hidden from Stride GH. You can put it back at any time.",
  published: "The race is back on Stride GH.",
  verification: "Badge updated.",
};

const origins = { seed: "Race calendar", submission: "Organiser", database: "Database" } as const;

export default async function AdminListings({ searchParams }: PageProps<"/admin/listings">) {
  await requireAdmin();
  const sp = await searchParams;
  const show = sp.show === "past" ? "past" : sp.show === "hidden" ? "hidden" : "upcoming";
  const [listings, today] = await Promise.all([getAdminListings(), getToday()]);
  const rows = listings.filter((l) =>
    show === "hidden" ? l.status === "archived" : l.status === "published" && (show === "past") === isPast(l.event, today),
  );
  if (show === "past") rows.reverse();
  const msg = typeof sp.done === "string" ? done[sp.done] : undefined;

  const tab = (key: string, label: string) => (
    <Link
      href={key === "upcoming" ? "/admin/listings" : `/admin/listings?show=${key}`}
      aria-current={key === show ? "page" : undefined}
      className={`rounded-full border px-4 py-2 text-sm font-bold ${key === show ? "border-sel bg-sel text-on-sel" : "border-line bg-surface"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <AdminHeader active="listings" />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8">
        <div>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none">Live listings</h1>
          <p className="mt-1.5 text-sm text-text2">Change a race&apos;s badge, or hide a race that was cancelled or listed by mistake.</p>
        </div>
        {msg && <Flash tone="ok">{msg}</Flash>}
        <nav aria-label="Filter listings" className="flex flex-wrap gap-2">
          {tab("upcoming", "Upcoming")}
          {tab("past", "Past")}
          {tab("hidden", "Hidden")}
        </nav>

        {rows.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-dash p-10 text-center text-sm text-text2">No races here.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map(({ event: e, status, origin }) => (
              <li
                key={e.slug}
                id={e.slug}
                className="grid scroll-mt-5 gap-3 rounded-[14px] border border-line bg-surface p-4 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-[8px] leading-none text-[#f4f2ec]"
                    style={{ background: e.coverColor }}
                  >
                    <span className="font-display text-xl font-extrabold">{formatDate.day(e.date)}</span>
                    <span className="text-[9px] font-bold text-volt">{formatDate.month(e.date)}</span>
                  </span>
                  <div className="min-w-0">
                    <Link href={`/events/${e.slug}`} className="block truncate font-display text-xl font-bold leading-tight hover:underline">
                      {e.name}
                    </Link>
                    <p className="text-xs text-text2">
                      {locationLabel(e)} · from {origins[origin]}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={changeListingVerification} className="flex items-center gap-2">
                    <input type="hidden" name="slug" value={e.slug} />
                    <select
                      name="verification"
                      defaultValue={e.verification}
                      aria-label={`Badge for ${e.name}`}
                      className="h-9 rounded-lg border border-line bg-bg px-2 text-sm"
                    >
                      <option value="verified">Checked with official page</option>
                      <option value="unverified">Not yet verified</option>
                      <option value="details_tbc">Details to be confirmed</option>
                    </select>
                    <button className="h-9 rounded-lg border border-outline px-3 text-sm font-bold">Save</button>
                  </form>
                  <form action={changeListingStatus}>
                    <input type="hidden" name="slug" value={e.slug} />
                    <input type="hidden" name="status" value={status === "archived" ? "published" : "archived"} />
                    <button
                      className={`h-9 rounded-lg px-3 text-sm font-bold ${status === "archived" ? "bg-primary text-on-primary" : "border border-danger text-danger"}`}
                    >
                      {status === "archived" ? "Show again" : "Hide"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
