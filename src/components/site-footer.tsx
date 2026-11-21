import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Wordmark } from "./site-header";

const columns = [
  {
    title: "Explore",
    links: [
      ["/events", "All races"],
      ["/events?when=30days", "Races in the next 30 days"],
      ["/shop", "Running gear"],
      ["/saved", "Saved races"],
    ],
  },
  {
    title: "Organisers",
    links: [
      ["/list", "List your race"],
      ["/list/status", "Check a submission"],
    ],
  },
  {
    title: "Stride GH",
    links: [
      ["/account", "Your account"],
      ["/events?when=past", "Past races"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer mt-20 bg-hero text-on-hero">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-8">
        <div className="flex max-w-sm flex-col gap-4">
          <Wordmark className="text-[30px]" />
          <p className="text-sm leading-relaxed text-on-hero2">{siteConfig.description}</p>
          <p className="text-xs leading-relaxed text-on-hero2">
            Races marked &ldquo;Not yet verified&rdquo; come from a community calendar. Registration and payment always happen on the
            organiser&apos;s own page — Stride GH doesn&apos;t take race entry payments.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-volt">{col.title.toUpperCase()}</h2>
            <ul className="flex flex-col gap-2.5">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-on-hero2 hover:text-on-hero">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-hero-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-on-hero2 md:px-8">
          <span>© 2026 {siteConfig.name} · Made in Accra</span>
          <span>Races and running gear across Ghana</span>
        </div>
      </div>
    </footer>
  );
}
