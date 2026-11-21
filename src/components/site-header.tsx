import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "./icon";
import { AccountLink, MobileMenu, NavLinks, NavLinksLive, SavedLink } from "./site-nav";
import { ThemeToggle } from "./theme-toggle";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 font-display font-extrabold leading-none tracking-wide ${className}`}>
      <LogoMark />
      <span>
        STRIDE<span className="ml-[3px] bg-volt px-[5px] text-night">GH</span>
      </span>
    </span>
  );
}

/** The app icon: a volt rounded square with a bold "S". Same mark as the favicon and the phone app. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.82, borderRadius: size * 0.22 }}
      className="inline-flex shrink-0 items-center justify-center bg-volt pt-[0.06em] font-display font-extrabold leading-none text-night"
    >
      S
    </span>
  );
}

/** Sticky top bar for the website: logo, main sections, search, saved, theme. Collapses to a menu on phones. */
export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 md:px-8">
        <Link href="/" aria-label="Stride GH home" className="shrink-0">
          <Wordmark className="text-[22px] min-[360px]:text-[26px]" />
        </Link>
        <Suspense fallback={<NavLinks pathname={null} />}>
          <NavLinksLive />
        </Suspense>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/events"
            aria-label="Search races"
            className="hidden h-10 items-center gap-2 rounded-full border border-line px-3.5 text-sm text-text2 hover:bg-tile lg:flex"
          >
            <Icon name="search" size={16} />
            Search races
          </Link>
          <SavedLink />
          {/* On small phones the theme switch is on the Account page instead. */}
          <span className="hidden sm:contents">
            <ThemeToggle tone="plain" />
          </span>
          <AccountLink />
          <Link
            href="/list"
            className="hidden h-10 items-center rounded-full bg-primary px-4 text-sm font-bold text-on-primary hover:opacity-90 md:flex"
          >
            List your race
          </Link>
          <Suspense fallback={null}>
            <MobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
