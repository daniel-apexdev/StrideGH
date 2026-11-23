import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { Wordmark } from "@/components/site-header";
import { SignInScreen } from "./sign-in-screen";

export const metadata: Metadata = { title: "Sign in or create an account" };

const perks = [
  { icon: "bookmark", text: "Saved races on every device" },
  { icon: "calendar", text: "Reminders before registration closes and race day" },
  { icon: "clock", text: "Your finish times, personal bests and year in running" },
] as const;

/**
 * Create account / sign in, on its own page without the site's header and footer
 * (hidden by body:has([data-auth]) in globals.css). Signing in sends people on to ?next=,
 * or to their account page.
 */
export default function SignInPage() {
  return (
    <main data-auth className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative flex flex-col justify-between gap-8 overflow-hidden bg-forest px-6 py-6 text-[#f4f2ec] sm:px-10 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Stride GH home">
            <Wordmark className="text-[24px] sm:text-[28px]" />
          </Link>
          <Link href="/" className="flex h-10 items-center gap-1.5 rounded-full border border-white/20 px-4 text-sm font-semibold hover:bg-white/10 lg:hidden">
            <Icon name="back" size={16} /> Site
          </Link>
        </div>

        <div className="hidden flex-col gap-6 lg:flex">
          <span className="text-xs font-bold tracking-[0.14em] text-volt">YOUR STRIDE GH ACCOUNT</span>
          <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.9] xl:text-7xl">
            Every race.
            <br />
            Every finish.
          </h1>
          <ul className="flex flex-col gap-4">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-lg">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-volt text-night">
                  <Icon name={p.icon} size={18} />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <Link href="/" className="hidden items-center gap-1.5 self-start text-sm font-semibold text-white/70 hover:text-white lg:flex">
          <Icon name="back" size={16} /> Back to Stride GH
        </Link>
        <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-10 select-none font-display text-[260px] font-extrabold leading-none text-white/[0.04]">
          GH
        </span>
      </aside>

      <section className="flex items-start justify-center bg-bg px-5 py-10 sm:px-10 lg:items-center lg:py-16">
        <div className="w-full max-w-md">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-tile" />}>
            <SignInScreen />
          </Suspense>
          <p className="mt-8 text-xs leading-relaxed text-text2">
            No password needed: each time, we email you a code. We only use your email for your account and the reminders you ask for.
          </p>
        </div>
      </section>
    </main>
  );
}
