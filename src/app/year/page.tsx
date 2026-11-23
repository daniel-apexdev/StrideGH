import type { Metadata } from "next";
import { Container, PageHero } from "@/components/page";
import { YearInRunningLive } from "@/components/runner/year-in-running";
import { getToday } from "@/lib/events/repository";

export const metadata: Metadata = { title: "Year in running" };

export default async function YearPage() {
  const today = await getToday();
  return (
    <main>
      <PageHero kicker="YOUR STATS" title="Year in running" crumbs={[{ href: "/", label: "Home" }, { label: "Year in running" }]}>
        <p className="max-w-2xl text-lg text-on-hero2">Your races, kilometres and best times, added up as you go. Share it when the year is done.</p>
      </PageHero>
      <Container className="pt-10">
        <YearInRunningLive builtOn={today} />
      </Container>
    </main>
  );
}
