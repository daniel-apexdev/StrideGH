import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { RaceCard } from "@/components/events/event-card";
import { VerificationBadge } from "@/components/events/verification-badge";
import { Container, SectionHeading } from "@/components/page";
import { AppWaitlist } from "@/components/runner/signups";
import { accountsOn } from "@/lib/accounts/configured";
import { ProductCard } from "@/components/shop/shop-bits";
import { citiesOf, getAllEvents, getToday, getUpcomingEvents } from "@/lib/events/repository";
import { countdown, coverNumeral, distanceSummary, feeLabel, formatDate, locationLabel } from "@/lib/events/format";
import { getAllProducts, getStores } from "@/lib/stores/repository";
import { isStaticSite, withBase } from "@/lib/site";

export default async function HomePage() {
  const today = await getToday();
  const [upcoming, all, stores, products] = await Promise.all([getUpcomingEvents(today), getAllEvents(), getStores(), getAllProducts()]);
  const next = upcoming.find((e) => e.poster && e.registration.method === "url") ?? upcoming.find((e) => e.registration.method === "url") ?? upcoming[0];
  const grid = upcoming.filter((e) => e !== next).slice(0, 6);
  const cities = citiesOf(all).length;
  const organisers = new Set(all.map((e) => e.organiser).filter(Boolean)).size;
  const thisMonth = upcoming.filter((e) => e.date.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-on-hero">
        <span aria-hidden className="outline-numeral pointer-events-none absolute -right-10 -top-16 hidden text-[420px] leading-none opacity-30 lg:block">
          GH
        </span>
        <Container className="relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <span className="text-xs font-bold tracking-[0.16em] text-volt">{upcoming.length} RACES COMING UP ACROSS GHANA</span>
            <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.86] tracking-tight md:text-8xl">
              Find your next <span className="text-volt">start line.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-on-hero2">
              Every road race, fun run and marathon in Ghana in one place — with dates, distances, fees and the official way to
              register. Plus running gear from local shops.
            </p>
            <form action={withBase(isStaticSite ? "/events/" : "/events")} className="flex max-w-xl items-center gap-2 rounded-2xl bg-surface p-2 text-text shadow-lg">
              <Icon name="search" className="ml-2.5 text-text2" />
              <label htmlFor="home-search" className="sr-only">
                Search races
              </label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="Search by race, town or organiser"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text2"
              />
              <button className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-on-primary">Search</button>
            </form>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-on-hero2">Popular:</span>
              {[
                ["5K", "/events?distance=5K"],
                ["10K", "/events?distance=10K"],
                ["Half marathon", "/events?distance=Half"],
                ["Accra", "/events?city=Accra"],
                ["Free entry", "/events?fee=free"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="rounded-full border border-hero-line px-3 py-1 font-semibold hover:bg-hero2">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {next && (
            <Link
              href={`/events/${next.slug}`}
              className="group relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-surface text-text shadow-[0_30px_60px_rgba(0,0,0,0.35)]"
            >
              <div className="relative aspect-[4/3.4] overflow-hidden" style={{ background: next.coverColor }}>
                {next.poster ? (
                  <Image src={next.poster.src} alt={next.poster.alt} fill priority sizes="(max-width: 1024px) 90vw, 440px" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <span aria-hidden className="outline-numeral absolute -bottom-10 -right-3 text-[220px]">
                    {coverNumeral(next)}
                  </span>
                )}
                <span className="absolute left-4 top-4 rounded-md bg-volt px-2.5 py-1 text-xs font-bold text-night">
                  Next race · {countdown(next.date, today)}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-5">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-link">{formatDate.long(next.date)}</span>
                <span className="font-display text-3xl font-bold leading-none group-hover:underline">{next.name}</span>
                <span className="flex items-center gap-1.5 text-sm text-text2">
                  <Icon name="pin" size={15} />
                  {locationLabel(next)}
                </span>
                <span className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="rounded-md bg-soft px-2 py-1 text-xs font-bold">{distanceSummary(next.distances)}</span>
                  <span className="text-sm font-semibold">{feeLabel(next)}</span>
                  <VerificationBadge event={next} today={today} className="ml-auto" />
                </span>
              </div>
            </Link>
          )}
        </Container>
      </section>

      {/* Numbers */}
      <section className="border-b border-line bg-surface">
        <Container className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
          {[
            [upcoming.length, "upcoming races"],
            [thisMonth, `in ${formatDate.monthName(today)}`],
            [cities, "towns and cities"],
            [organisers, "organisers listed"],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1 py-6 md:px-6 md:first:pl-0">
              <span className="font-display text-5xl font-extrabold leading-none">{n}</span>
              <span className="text-sm text-text2">{label}</span>
            </div>
          ))}
        </Container>
      </section>

      {/* Upcoming grid */}
      <Container as="section" className="pt-16">
        <SectionHeading kicker="ON THE CALENDAR" title="Upcoming races" action={{ href: "/events", label: `All ${upcoming.length} races` }} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {grid.map((e) => (
            <RaceCard key={e.slug} event={e} today={today} />
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-text2">
          <strong className="text-text">Checked</strong> races have been matched to the organiser&apos;s official page.{" "}
          <strong className="text-text">Not yet verified</strong> races come from a community calendar — always check the official page
          before you pay.
        </p>
      </Container>

      {/* Distances */}
      <Container as="section" className="pt-16">
        <SectionHeading kicker="BY DISTANCE" title="Pick your distance" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["5K", "5K", "First race or a fast one"],
            ["10K", "10K", "The classic road race"],
            ["Half", "21.1K", "Half marathon"],
            ["Marathon", "42.2K", "The full distance"],
          ].map(([key, big, label]) => {
            const n = upcoming.filter((e) => e.distances.some((d) => d.category === key)).length;
            return (
              <Link
                key={key}
                href={`/events?distance=${key}`}
                className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl bg-ink p-5 text-on-ink hover:bg-hero"
              >
                <span aria-hidden className="outline-numeral absolute -right-2 -top-4 text-[110px] leading-none opacity-60">
                  {big}
                </span>
                <span className="relative font-display text-3xl font-extrabold uppercase leading-none">{label}</span>
                <span className="relative text-sm text-on-ink2">
                  {n} {n === 1 ? "race" : "races"} coming up →
                </span>
              </Link>
            );
          })}
        </div>
      </Container>

      {/* Shop */}
      {products.length > 0 && (
        <Container as="section" className="pt-16">
          <SectionHeading kicker="FROM LOCAL SHOPS" title="Running gear" action={{ href: "/shop", label: "Visit the shop" }} />
          {stores.every((s) => s.demo) && (
            <p className="mb-5 text-sm text-text2">Sample shops for now — real local running shops are being added.</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={`${p.store.slug}/${p.slug}`} product={p} showStore />
            ))}
          </div>
        </Container>
      )}

      {/* App waiting list */}
      {accountsOn && (
        <Container as="section" className="pt-16">
          <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-hero p-8 text-on-hero md:grid-cols-[1.1fr_1fr] md:p-12">
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold tracking-[0.14em] text-volt">COMING SOON · THE STRIDE GH APP</span>
              <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] md:text-5xl">Your races in your pocket</h2>
              <p className="max-w-lg text-on-hero2">
                Race-day reminders on your phone, your race history and times, and new races near you. Same account as the website.
              </p>
            </div>
            <AppWaitlist />
          </div>
        </Container>
      )}

      {/* Organisers */}
      <Container as="section" className="pt-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-ink p-8 text-on-ink md:grid-cols-[1.3fr_1fr] md:p-12">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold tracking-[0.14em] text-volt">FOR ORGANISERS · FREE</span>
            <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] md:text-5xl">Organising a race? Get it in front of runners.</h2>
            <p className="max-w-lg text-on-ink2">
              List your race for free. We check every listing against your official page, and runners register on your own site.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/list" className="flex h-12 items-center rounded-xl bg-volt px-6 font-bold text-night">
                List your race
              </Link>
              <Link href="/list/status" className="flex h-12 items-center rounded-xl border border-hero-line px-6 font-semibold">
                Check a submission
              </Link>
            </div>
          </div>
          <ol className="flex flex-col gap-3">
            {["Tell us about the race", "We check it, usually within 2 working days", "It goes live on the website and app"].map((t, i) => (
              <li key={t} className="flex items-center gap-4 rounded-2xl border border-hero-line p-4">
                <span className="font-display text-4xl font-extrabold leading-none text-volt">{i + 1}</span>
                <span className="font-semibold">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </main>
  );
}
