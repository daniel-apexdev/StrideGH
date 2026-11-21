import type { ReactNode } from "react";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { storageMode } from "@/lib/submissions/store";

export function AdminHeader({ active }: { active: "queue" | "listings" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${on ? "bg-volt text-night" : "text-on-hero2 hover:text-on-hero"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="bg-forest text-[#f4f2ec]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-volt font-display text-xl font-extrabold text-night">
            S
          </span>
          <span className="font-display text-xl font-extrabold uppercase tracking-wide">
            Stride GH <span className="text-volt">Admin</span>
          </span>
        </Link>
        <nav aria-label="Admin" className="flex gap-1">
          {tab("/admin", "Review queue", active === "queue")}
          {tab("/admin/listings", "Live listings", active === "listings")}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {storageMode() === "local" && (
            <span className="rounded-full border border-[#3c6a57] px-2.5 py-1 text-xs text-[#cfe0d6]" title="Saved in data/local on this computer">
              Local data
            </span>
          )}
          <Link href="/" className="font-semibold text-[#cfe0d6] hover:text-white">
            View site
          </Link>
          <form action={logout}>
            <button className="font-semibold text-[#cfe0d6] hover:text-white">Sign out</button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Flash({ tone, children }: { tone: "ok" | "warn"; children: ReactNode }) {
  return (
    <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${tone === "ok" ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"}`}>
      {children}
    </p>
  );
}
