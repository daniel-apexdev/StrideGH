"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import { useSavedEvents } from "@/lib/saved";
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export const mainNav = [
  { href: "/events", label: "Races" },
  { href: "/shop", label: "Shop" },
  { href: "/list", label: "For organisers" },
] as const;

const isActive = (pathname: string | null, href: string) =>
  !!pathname && (pathname === href || pathname.startsWith(href + "/"));

/** Desktop links that highlight the current section (render inside <Suspense>). */
export function NavLinksLive() {
  return <NavLinks pathname={usePathname()} />;
}

/** Desktop links. `pathname` is null while a page is prerendered without one. */
export function NavLinks({ pathname: path }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {mainNav.map((item) => {
          const on = isActive(path, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`relative flex h-16 items-center px-3 text-[15px] font-semibold ${on ? "text-text" : "text-text2 hover:text-text"}`}
              >
                {item.label}
                {on && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-primary"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const noop = () => () => {};

export function SavedLink() {
  const { saved } = useSavedEvents();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const n = mounted ? saved.length : 0;
  return (
    <Link
      href="/saved"
      aria-label={n ? `Saved races (${n})` : "Saved races"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line hover:bg-tile"
    >
      <Icon name="bookmark" size={18} />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-volt px-1 text-[11px] font-bold text-night">
          {n}
        </span>
      )}
    </Link>
  );
}

/** Account button: the person's initials once signed in, otherwise a person icon. */
export function AccountLink() {
  const account = useAccount();
  const profile =
    account.status === "signed-in" ? profileOf(account.user) : null;
  const initials = profile
    ? (profile.name || profile.email)
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;
  return (
    <Link
      href={profile ? "/account" : "/signin"}
      aria-label={
        profile
          ? `Your account (${profile.name || profile.email})`
          : "Sign in or create an account"
      }
      className={`flex h-10 w-10 items-center justify-center rounded-full ${
        initials
          ? "bg-volt text-sm font-extrabold text-night"
          : "border border-line hover:bg-tile"
      }`}
    >
      {initials ?? <Icon name="user" size={18} />}
    </Link>
  );
}

/**
 * Phone and small-tablet menu: a full-screen panel with big tiles for the main sections,
 * the visitor's account, the theme switch and "List your race".
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const account = useAccount();
  const { saved } = useSavedEvents();
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  // Close after navigating.
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const profile =
    account.status === "signed-in" ? profileOf(account.user) : null;
  const initials = profile
    ? (profile.name || profile.email)
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : null;
  const savedCount = mounted ? saved.length : 0;
  const tiles = [
    {
      href: "/events",
      label: "Races",
      note: "Find your next race",
      icon: "calendar",
    },
    {
      href: "/shop",
      label: "Shop",
      note: "Gear from local shops",
      icon: "bag",
    },
    {
      href: "/saved",
      label: "Saved",
      note: savedCount
        ? `${savedCount} saved race${savedCount === 1 ? "" : "s"}`
        : "Races you bookmark",
      icon: "bookmark",
    },
    {
      href: "/list",
      label: "Organisers",
      note: "List a race for free",
      icon: "flag",
    },
  ] as const;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Open menu"
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(true);
        }}
        className="flex h-10 min-w-10 items-center justify-center gap-2 rounded-full bg-ink px-2.5 text-sm font-bold text-on-ink min-[380px]:pl-3 min-[380px]:pr-3.5"
      >
        <Icon name="menu" size={18} />
        <span className="max-[379px]:sr-only">Menu</span>
      </button>
      {/* Rendered on <body> so the sticky header's blur can't trap it inside the header. */}
      {open &&
        createPortal(
          <div
            id="mobile-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="menu-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-hero px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-on-hero"
          >
            <div className="flex h-12 items-center justify-between">
              <span className="text-xs font-bold tracking-[0.16em] text-on-hero2">
                MENU
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/15"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            <nav aria-label="Main" className="mt-3">
              <ul className="grid grid-cols-2 gap-3">
                {tiles.map((t) => {
                  const on = isActive(pathname, t.href);
                  return (
                    <li key={t.href}>
                      <Link
                        href={t.href}
                        aria-current={on ? "page" : undefined}
                        className={`flex h-full min-h-[128px] flex-col justify-between rounded-2xl border p-4 transition ${
                          on
                            ? "border-volt bg-volt text-night"
                            : "border-white/10 bg-white/[0.06] hover:bg-white/10"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${on ? "bg-night/10" : "bg-white/10"}`}
                        >
                          <Icon name={t.icon} size={20} />
                        </span>
                        <span>
                          <span className="block font-display text-[26px] font-extrabold uppercase leading-none">
                            {t.label}
                          </span>
                          <span
                            className={`mt-1 block text-xs ${on ? "text-night/70" : "text-on-hero2"}`}
                          >
                            {t.note}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <Link
              href={profile ? "/account" : "/signin"}
              className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 hover:bg-white/10"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  initials ? "bg-volt font-extrabold text-night" : "bg-white/10"
                }`}
              >
                {initials ?? <Icon name="user" size={20} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {profile
                    ? profile.name || profile.email
                    : "Sign in or create an account"}
                </span>
                <span className="block truncate text-xs text-on-hero2">
                  {profile
                    ? "Your account & settings"
                    : "Free, with an email code. No password."}
                </span>
              </span>
              <Icon name="arrow" size={18} className="text-on-hero2" />
            </Link>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5">
              <Link
                href="/"
                className="flex h-10 items-center gap-2 font-semibold"
              >
                <Icon name="home" size={18} /> Home
              </Link>
              <span className="flex items-center gap-3 text-sm text-on-hero2">
                Theme <ThemeToggle />
              </span>
            </div>

            <div className="mt-auto pt-6">
              <Link
                href="/list"
                className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-volt font-bold text-night"
              >
                List your race <Icon name="arrow" size={18} />
              </Link>
              <p className="mt-3 text-center text-xs text-on-hero2">
                Stride GH · Races and running gear across Ghana
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
