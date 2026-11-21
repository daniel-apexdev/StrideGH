import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHero } from "@/components/page";
import { StatusLookup } from "@/components/list/status-lookup";
import { contactEmail, isStaticSite } from "@/lib/site";

export const metadata: Metadata = { title: "Check your submission" };

export default function StatusPage() {
  return (
    <main>
      <PageHero
        kicker="FOR ORGANISERS"
        title="Check your submission"
        crumbs={[{ href: "/", label: "Home" }, { href: "/list", label: "List your race" }, { label: "Check a submission" }]}
      >
        <p className="max-w-2xl text-lg text-on-hero2">See where your race is in review with the reference we gave you and your email.</p>
      </PageHero>
      <Container narrow className="pt-10">
        {isStaticSite ? (
          <p className="rounded-2xl border border-line bg-surface p-6 text-body">
            We reply by email to every race we receive, usually within 2 working days.
            {contactEmail ? (
              <>
                {" "}To ask about a race you sent, email{" "}
                <a className="font-semibold text-link underline" href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
                .
              </>
            ) : (
              " To ask about a race you sent, reply to that email."
            )}
          </p>
        ) : (
          <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-tile" />}>
            <StatusLookup />
          </Suspense>
        )}
      </Container>
    </main>
  );
}
