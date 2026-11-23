import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHero } from "@/components/page";
import { UnsubscribeLive } from "@/components/runner/signups";

export const metadata: Metadata = { title: "Email preferences", robots: { index: false } };

/** The "stop these emails" link in every reminder and alert lands here. */
export default function UnsubscribePage() {
  return (
    <main>
      <PageHero title="Email preferences" crumbs={[{ href: "/", label: "Home" }, { label: "Email preferences" }]} />
      <Container narrow className="pt-10">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-tile" />}>
          <UnsubscribeLive />
        </Suspense>
      </Container>
    </main>
  );
}
