"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { citiesOf, filterEvents, hrefWith, parseFilters } from "@/lib/events/filter";
import { distanceCategories, type EventFilters, type RaceEvent } from "@/lib/events/types";
import { useToday } from "@/lib/use-today";
import { Icon } from "../icon";
import { RaceCard } from "./event-card";

/** Reads the filters from the address bar. Render inside <Suspense>. */
export function RaceFinderLive({ events, builtOn }: { events: RaceEvent[]; builtOn: string }) {
  const sp = useSearchParams();
  return <RaceFinder events={events} builtOn={builtOn} filters={parseFilters(Object.fromEntries(sp.entries()))} />;
}

/**
 * Search box, filter sidebar and race grid. Filtering happens in the browser, so the page works the same
 * on a server and on a static host such as GitHub Pages.
 */
export function RaceFinder({ events: all, builtOn, filters: f }: { events: RaceEvent[]; builtOn: string; filters: EventFilters }) {
  const router = useRouter();
  const today = useToday(builtOn);
  const list = filterEvents(all, f, today);
  const cities = citiesOf(all);
  const moreActive = [f.when !== "upcoming", !!f.city, !!f.fee].filter(Boolean).length;
  const whenLabel = { upcoming: "upcoming", "30days": "in the next 30 days", past: "past races" }[f.when ?? "upcoming"];
  const count = (change: Partial<EventFilters>) => filterEvents(all, { ...f, ...change }, today).length;
  const active = [f.distance, f.when !== "upcoming", f.city, f.fee, f.q].filter(Boolean).length;

  const filters = (
    <div className="flex flex-col gap-6">
      <FilterGroup label="Distance">
        <Option href={hrefWith(f, { distance: undefined })} on={!f.distance} count={count({ distance: undefined })}>
          All distances
        </Option>
        {distanceCategories.map((d) => (
          <Option key={d} href={hrefWith(f, { distance: d })} on={f.distance === d} count={count({ distance: d })}>
            {d === "Half" ? "Half marathon" : d === "Other" ? "Other distances" : d}
          </Option>
        ))}
      </FilterGroup>
      <FilterGroup label="When">
        <Option href={hrefWith(f, { when: "upcoming" })} on={f.when === "upcoming"}>
          Upcoming
        </Option>
        <Option href={hrefWith(f, { when: "30days" })} on={f.when === "30days"}>
          Next 30 days
        </Option>
        <Option href={hrefWith(f, { when: "past" })} on={f.when === "past"}>
          Past races
        </Option>
      </FilterGroup>
      <FilterGroup label="Where">
        <Option href={hrefWith(f, { city: undefined })} on={!f.city} count={count({ city: undefined })}>
          Anywhere
        </Option>
        {cities.map((c) => (
          <Option key={c} href={hrefWith(f, { city: c })} on={f.city === c} count={count({ city: c })}>
            {c}
          </Option>
        ))}
        <Option href={hrefWith(f, { city: "unlisted" })} on={f.city === "unlisted"} count={count({ city: "unlisted" })}>
          Venue not listed
        </Option>
      </FilterGroup>
      <FilterGroup label="Entry fee">
        <Option href={hrefWith(f, { fee: undefined })} on={!f.fee}>
          Any
        </Option>
        <Option href={hrefWith(f, { fee: "free" })} on={f.fee === "free"} count={count({ fee: "free" })}>
          Free
        </Option>
        <Option href={hrefWith(f, { fee: "paid" })} on={f.fee === "paid"} count={count({ fee: "paid" })}>
          Paid
        </Option>
        <Option href={hrefWith(f, { fee: "unconfirmed" })} on={f.fee === "unconfirmed"} count={count({ fee: "unconfirmed" })}>
          Fee not confirmed
        </Option>
      </FilterGroup>
      {active > 0 && (
        <Link href="/events" className="text-sm font-bold text-link hover:underline">
          Clear all filters
        </Link>
      )}
    </div>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside aria-label="Filters">
        <details className="rounded-2xl border border-line bg-surface p-4 lg:hidden" open={moreActive > 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold">
            <Icon name="sliders" size={18} />
            Filters
            {active > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-on-primary">{active}</span>
            )}
          </summary>
          <div className="pt-4">{filters}</div>
        </details>
        <div className="sticky top-24 hidden lg:block">{filters}</div>
      </aside>

      <section aria-label="Results" className="flex flex-col gap-5">
        <form
          role="search"
          key={f.q ?? ""}
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(hrefWith(f, { q: q || undefined }), { scroll: false });
          }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2"
        >
          <Icon name="search" size={18} className="ml-2.5 text-text2" />
          <label htmlFor="q" className="sr-only">
            Search races
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Race name, town or organiser"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text2"
          />
          <button className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary">Search</button>
        </form>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-text2" aria-live="polite">
            <strong className="text-text">
              {list.length} {list.length === 1 ? "race" : "races"}
            </strong>{" "}
            · {whenLabel}
            {f.q && <> · matching &ldquo;{f.q}&rdquo;</>}
          </p>
          <Link href="/list" className="text-sm font-bold text-link hover:underline">
            Know a race we&apos;re missing? Submit it →
          </Link>
        </div>
        {list.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {list.map((e, i) => (
              <RaceCard key={e.slug} event={e} today={today} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-dash px-4 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tile text-icon">
              <Icon name="calendar" size={28} strokeWidth={1.8} />
            </span>
            <h2 className="font-display text-3xl font-extrabold uppercase">No races match</h2>
            <p className="text-sm text-text2">Try another distance, place or date range.</p>
            <Link href="/events" className="mt-1 flex h-11 items-center rounded-xl border-[1.5px] border-outline px-5 text-sm font-semibold">
              Clear filters
            </Link>
          </div>
        )}
        <p className="max-w-3xl text-xs leading-relaxed text-text2">
          <strong className="text-text">Checked</strong> means we matched the listing to the organiser&apos;s official page.{" "}
          <strong className="text-text">Not yet verified</strong> means it came from a community calendar — check the official page
          before paying. Races move to &ldquo;Past races&rdquo; the day after they happen and stay there for a year.
        </p>
      </section>
    </div>
  );
}

function Option({ href, on, children, count }: { href: string; on: boolean; children: ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? "true" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[14px] ${on ? "bg-tile font-bold" : "hover:bg-tile"}`}
    >
      <span aria-hidden className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-dash"}`}>
        {on && <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
      <span className="flex-1">{children}</span>
      {count !== undefined && <span className="text-xs text-text2">{count}</span>}
    </Link>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1">
      <span className="mb-1 px-2 text-xs font-bold tracking-[0.1em] text-text2">{label.toUpperCase()}</span>
      {children}
    </div>
  );
}
