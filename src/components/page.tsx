import Link from "next/link";
import type { ReactNode } from "react";

/** The website's content width. */
export function Container({
  children,
  className = "",
  as: Tag = "div",
  narrow,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "main" | "header";
  /** Reading width, for forms and single-column pages. */
  narrow?: boolean;
}) {
  return <Tag className={`mx-auto w-full px-5 md:px-8 ${narrow ? "max-w-3xl" : "max-w-6xl"} ${className}`}>{children}</Tag>;
}

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items, tone = "plain" }: { items: Crumb[]; tone?: "plain" | "hero" }) {
  const muted = tone === "hero" ? "text-on-hero2 hover:text-on-hero" : "text-text2 hover:text-text";
  return (
    <nav aria-label="Breadcrumb" className="text-[13px]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className={tone === "hero" ? "text-on-hero2" : "text-text2"}>/</span>}
            {c.href ? (
              <Link href={c.href} className={muted}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={tone === "hero" ? "text-on-hero" : "text-text"}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Big band at the top of section pages (Races, Shop, Saved…). */
export function PageHero({ kicker, title, children, crumbs }: { kicker?: string; title: ReactNode; children?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <section className="bg-hero text-on-hero">
      <Container className="flex flex-col gap-3 py-10 md:py-14">
        {crumbs && <Breadcrumbs items={crumbs} tone="hero" />}
        {kicker && <span className="text-xs font-bold tracking-[0.14em] text-volt">{kicker}</span>}
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] md:text-7xl">{title}</h1>
        {children}
      </Container>
    </section>
  );
}

export function SectionHeading({ title, action, kicker }: { title: string; kicker?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {kicker && <span className="mb-1 block text-xs font-bold tracking-[0.14em] text-link">{kicker}</span>}
        <h2 className="font-display text-4xl font-extrabold uppercase leading-none md:text-5xl">{title}</h2>
      </div>
      {action && (
        <Link href={action.href} className="shrink-0 text-sm font-bold text-link hover:underline">
          {action.label} →
        </Link>
      )}
    </div>
  );
}
