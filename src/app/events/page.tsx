import type { Metadata } from "next";
import { Suspense } from "react";
import { RaceFinder, RaceFinderLive } from "@/components/events/race-finder";
import { Container, PageHero } from "@/components/page";
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
    </main>
  );
}
