import type { Metadata } from "next";
import { Suspense } from "react";
import { RaceFinder, RaceFinderLive } from "@/components/events/race-finder";
import { Container, PageHero } from "@/components/page";
import { NewRaceAlerts } from "@/components/runner/signups";
import { accountsOn } from "@/lib/accounts/configured";
import { citiesOf } from "@/lib/events/filter";
import { getAllEvents, getToday } from "@/lib/events/repository";

export const metadata: Metadata = { title: "Races & events" };

const noFilters = { when: "upcoming" } as const;

export default async function EventsPage() {
  const [all, today] = await Promise.all([getAllEvents(), getToday()]);
  return (
    <main>
      <PageHero kicker="RACE CALENDAR" title="Races & events" crumbs={[{ href: "/", label: "Home" }, { label: "Races" }]}>
        <p className="max-w-2xl text-lg text-on-hero2">Road races, fun runs and marathons across Ghana — with the official way to register.</p>
      </PageHero>
      <Container className="pt-10">
        {/* The unfiltered list is in the page itself; filters from the address bar apply once it loads. */}
        <Suspense fallback={<RaceFinder events={all} builtOn={today} filters={noFilters} />}>
          <RaceFinderLive events={all} builtOn={today} />
        </Suspense>
      </Container>
      {accountsOn && (
        <Container as="section" className="pt-16">
          <div id="alerts" className="grid gap-8 rounded-3xl bg-hero p-6 text-on-hero md:grid-cols-[1fr_1.2fr] md:p-10">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold tracking-[0.14em] text-volt">NEW-RACE ALERTS</span>
              <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] md:text-5xl">Hear about new races first</h2>
              <p className="text-on-hero2">
                Choose your distances and towns. When a matching race is listed, we email you, usually long before registration fills up.
              </p>
            </div>
            <NewRaceAlerts cities={citiesOf(all)} tone="hero" />
          </div>
        </Container>
      )}
    </main>
  );
}
