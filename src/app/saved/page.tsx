import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Container, PageHero } from "@/components/page";
import { SavedList } from "@/components/events/saved-list";
import { getAllEvents } from "@/lib/events/repository";

export const metadata: Metadata = { title: "Saved races" };

export default async function SavedPage() {
  const events = await getAllEvents();
  return (
    <main>
      <PageHero kicker="YOUR LIST" title="Saved races" crumbs={[{ href: "/", label: "Home" }, { label: "Saved" }]}>
        <p className="flex items-center gap-2 text-on-hero2">
          <Icon name="info" size={18} />
          Saved in this browser. Signing in to keep them across devices is coming to the website soon.
        </p>
      </PageHero>
      <Container className="pt-10">
        <SavedList events={events} />
      </Container>
    </main>
  );
}
