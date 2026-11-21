import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Container, PageHero } from "@/components/page";
import { AccountPanel } from "@/components/account/account-panel";
import { ThemeSelector } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  return (
    <main>
      <PageHero kicker="ACCOUNT & SETTINGS" title="Your account" crumbs={[{ href: "/", label: "Home" }, { label: "Account" }]} />
      <Container className="grid gap-6 pt-10 md:grid-cols-2">
        <div className="md:col-span-2">
          <AccountPanel />
        </div>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-2xl font-extrabold uppercase">Appearance</h2>
          <ThemeSelector />
          <p className="text-sm text-text2">System follows your device&apos;s light or dark setting.</p>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-2xl font-extrabold uppercase">Saved races</h2>
          <p className="text-body">Races you bookmark are kept in this browser, so they&apos;re here even when you&apos;re signed out.</p>
          <Link href="/saved" className="flex items-center gap-1 self-start font-semibold text-link">
            See your saved races <Icon name="arrow" size={16} />
          </Link>
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
