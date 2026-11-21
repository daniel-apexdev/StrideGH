"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import { useSavedEvents } from "@/lib/saved";
import { Icon } from "./icon";

export const mainNav = [
  { href: "/events", label: "Races" },
  { href: "/shop", label: "Shop" },
  { href: "/list", label: "For organisers" },
] as const;

const isActive = (pathname: string | null, href: string) => !!pathname && (pathname === href || pathname.startsWith(href + "/"));

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
                {on && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-primary" />}
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
  const mounted = useSyncExternalStore(noop, () => true, () => false);
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
  const profile = account.status === "signed-in" ? profileOf(account.user) : null;
  const initials = profile ? (profile.name || profile.email).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() : null;
  return (
    <Link
      href="/account"
      aria-label={profile ? `Your account (${profile.name || profile.email})` : "Sign in or create an account"}
      className={`flex h-10 w-10 items-center justify-center rounded-full ${
        initials ? "bg-volt text-sm font-extrabold text-night" : "border border-line hover:bg-tile"
      }`}
    >
      {initials ?? <Icon name="user" size={18} />}
    </Link>
  );
}

/** Phone and small-tablet menu. Closes when you pick a page or press Escape. */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const panel = useRef<HTMLDivElement>(null);
  // Close after navigating.
  if (open && openedAt !== pathname) {
    setOpen(false);
    setOpenedAt(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector("a")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen(!open);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line"
      >
        <Icon name={open ? "x" : "menu"} size={18} />
      </button>
      {open && (
        <div id="mobile-menu" ref={panel} className="fixed inset-x-0 top-16 z-40 border-b border-line bg-bg px-5 pb-6 pt-2 shadow-xl">
          <nav aria-label="Main">
            <ul className="flex flex-col">
              {[{ href: "/", label: "Home" }, ...mainNav, { href: "/saved", label: "Saved races" }, { href: "/account", label: "Account & settings" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex h-14 items-center justify-between border-b border-line2 font-display text-2xl font-bold uppercase"
                  >
                    {item.label}
                    <Icon name="arrow" size={18} className="text-text2" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link href="/list" className="mt-5 flex h-12 items-center justify-center rounded-xl bg-primary font-bold text-on-primary">
            List your race
          </Link>
        </div>
      )}
    </div>
  );
}
