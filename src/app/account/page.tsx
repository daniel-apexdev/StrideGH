import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Container, PageHero } from "@/components/page";
import { ThemeSelector } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Settings" };

export default function AccountPage() {
  return (
    <main>
      <PageHero title="Settings" crumbs={[{ href: "/", label: "Home" }, { label: "Settings" }]} />
      <Container className="grid gap-6 pt-10 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-2xl font-extrabold uppercase">Appearance</h2>
          <ThemeSelector />
          <p className="text-sm text-text2">System follows your device&apos;s light or dark setting.</p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-2xl font-extrabold uppercase">Your account</h2>
          <p className="text-body">
            Signing in on the website is coming soon. Until then, saved races stay in this browser. In the Stride GH app you can already
            create an account with an emailed code.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-ink p-6 text-on-ink md:col-span-2 md:flex-row md:items-center md:justify-between">
          <span>
            <span className="block font-display text-2xl font-extrabold uppercase">Organising a race?</span>
            <span className="text-on-ink2">List it free, or check on a race you&apos;ve already sent.</span>
          </span>
          <span className="flex flex-wrap gap-3">
            <Link href="/list" className="flex h-12 items-center gap-2 rounded-xl bg-volt px-5 font-bold text-night">
              <Icon name="calendarPlus" size={18} /> List your race
            </Link>
            <Link href="/list/status" className="flex h-12 items-center gap-2 rounded-xl border border-hero-line px-5 font-semibold">
              <Icon name="clock" size={18} /> Check a submission
            </Link>
          </span>
        </section>
      </Container>
    </main>
  );
}
