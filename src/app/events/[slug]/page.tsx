import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { RaceCard } from "@/components/events/event-card";
import { RegisterBar, RegisterPanel } from "@/components/events/register-bar";
import { Breadcrumbs, Container, SectionHeading } from "@/components/page";
import { PhotoCarousel, PosterFrame } from "@/components/events/poster-gallery";
import { SaveButton } from "@/components/events/save-button";
import { VerificationBadge } from "@/components/events/verification-badge";
import { getAllEvents, getEventBySlug, getToday } from "@/lib/events/repository";
import {
  countdown,
  coverNumeral,
  distanceSummary,
  feeLabel,
  formatDate,
  formatPrice,
  formatStartTime,
  googleCalendarUrl,
  hostOf,
  isPast,
  nextEdition,
  locationLabel,
  mapsUrl,
  whatsappShareUrl,
} from "@/lib/events/format";
import type { RaceEvent } from "@/lib/events/types";

export async function generateStaticParams() {
  return (await getAllEvents()).map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) return { title: "Race not found" };
  return {
    title: event.name,
    description: `${event.name} — ${formatDate.long(event.date)}. ${distanceSummary(event.distances)}. ${feeLabel(event)}.`,
  };
}

function statusCopy(e: RaceEvent) {
  if (e.verification === "verified") {
    const when = e.verifiedAt ? formatDate.long(e.verifiedAt.slice(0, 10)) : "recently";
    return {
      cls: "bg-ok-bg text-ok-fg",
      title: `Checked against the official page · ${when}`,
      text: "The details here match the organiser's own page. Anything still unclear is noted below.",
    };
  }
  if (e.verification === "details_tbc") {
    return {
      cls: "bg-warn-bg text-warn-fg",
      title: "Details still to be confirmed",
      text: "The organiser hasn't published full details yet. We'll update this listing when they do.",
    };
  }
  return {
    cls: "bg-neu-bg text-neu-fg",
    title: "Not yet verified by Stride GH",
    text: "This listing comes from a community race calendar. We haven't confirmed it with the organiser yet, so check the official page before you pay.",
  };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [all, today] = await Promise.all([getAllEvents(), getToday()]);
  const past = isPast(event, today);
  const upcomingOthers = all.filter((e) => e.slug !== event.slug && !isPast(e, today));
  const sameMonth = upcomingOthers.filter((e) => e.date.slice(0, 7) === event.date.slice(0, 7));
  const others = (sameMonth.length ? sameMonth : upcomingOthers).slice(0, 6);
  const organiserCount = event.organiser ? all.filter((e) => e.organiser === event.organiser).length : 0;
  const next = nextEdition(event, all);
  const status = past
    ? {
        cls: "bg-neu-bg text-neu-fg",
        title: "This race has taken place",
        text: "We keep past races here for reference. When the organiser announces the next edition, it gets its own page and we link it from here.",
      }
    : statusCopy(event);
  const map = mapsUrl(event);
  const start = formatStartTime(event.startTime);

  const register = {
    fee: feeLabel(event),
    past,
    method: event.registration.method,
    url: event.registration.url,
    host: hostOf(event.registration.url),
    note: event.registration.note,
  };
  const images = [...(event.poster ? [event.poster] : []), ...event.gallery];

  return (
    <main className="pb-24 lg:pb-0">
      {/* Top: poster on the left, the essentials and registration on the right */}
      <section className="relative overflow-hidden text-[#f4f2ec]" style={{ background: event.coverColor }}>
        {/* Past races get a darker, greyed-out header so it's clear at a glance. */}
        {past && <span aria-hidden className="absolute inset-0 bg-[#0d1210]/70 backdrop-grayscale" />}
        <span aria-hidden className="outline-numeral pointer-events-none absolute -right-10 -top-16 text-[360px] leading-none opacity-25">
          {coverNumeral(event)}
        </span>
        <Container className="relative flex flex-col gap-8 py-8 md:py-12">
          <Breadcrumbs
            tone="hero"
            items={[
              { href: "/", label: "Home" },
              past ? { href: "/events?when=past", label: "Past races" } : { href: "/events", label: "Races" },
              { label: event.name },
            ]}
          />
          {past && <PastBanner date={event.date} next={next} />}
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col items-center gap-4 lg:items-start">
              {event.poster ? (
                <PosterFrame poster={event.poster} images={images} raceName={event.name} muted={past} />
              ) : (
                <div className={past ? "grayscale" : ""}>
                  <TypographicPoster event={event} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5">
              <VerificationBadge event={event} today={today} />
              <h1 className={`font-display text-5xl font-extrabold uppercase leading-[0.9] md:text-7xl ${past ? "text-white/80" : ""}`}>{event.name}</h1>
              <p className="flex items-center gap-2 text-lg text-white/85">
                <Icon name="pin" size={18} />
                {locationLabel(event)}
              </p>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/20 text-text">
                <Fact label="Date" value={formatDate.long(event.date)} />
                {past ? <Fact label="Status" value="Race over" muted /> : <Fact label="Countdown" value={countdown(event.date, today)} />}
                <Fact label="Distances" value={distanceSummary(event.distances)} />
                <Fact label="Start time" value={start ?? "Not listed yet"} muted={!start} />
              </dl>
              <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5 text-text shadow-xl">
                <RegisterPanel {...register} />
                {!past && (
                  <div className="grid grid-cols-3 gap-2 border-t border-line pt-4">
                    <SaveButton slug={event.slug} wide />
                    <a
                      href={googleCalendarUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-outline text-sm font-semibold"
                    >
                      <Icon name="calendarPlus" size={18} /> <span className="hidden sm:inline">Calendar</span>
                    </a>
                    <a
                      href={whatsappShareUrl(event)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-outline text-sm font-semibold"
                    >
                      <Icon name="share" size={18} /> <span className="hidden sm:inline">Share</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {event.gallery.length > 0 && (
        <Container as="section" className="pt-12">
          <SectionHeading kicker={`${event.gallery.length} ${event.gallery.length === 1 ? "IMAGE" : "IMAGES"}`} title="Photos & flyers" />
          <PhotoCarousel photos={event.gallery} images={images} raceName={event.name} />
        </Container>
      )}

      <Container className="grid gap-12 pt-12 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-12">
          <div className={`flex gap-3 rounded-2xl p-5 ${status.cls}`}>
            <Icon name="info" size={22} className="shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="font-bold">{status.title}</span>
              <span className="text-sm leading-relaxed">{status.text}</span>
            </div>
          </div>

          {event.description && (
            <Section title="About this race">
              <p className="whitespace-pre-line text-[17px] leading-relaxed text-body">{event.description}</p>
              <p className="text-xs text-text2">In the organiser&apos;s words.</p>
            </Section>
          )}

          <Section title="Distances & fees">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <table className="w-full text-left">
                <thead className="bg-soft text-xs font-bold tracking-[0.08em] text-text2">
                  <tr>
                    <th className="px-5 py-3">DISTANCE</th>
                    <th className="px-5 py-3 text-right">ENTRY FEE</th>
                  </tr>
                </thead>
                <tbody>
                  {event.distances.map((d) => {
                    const price = formatPrice(d.priceMinor, event.currency);
                    return (
                      <tr key={d.label} className="border-t border-line2">
                        <td className="px-5 py-4">
                          <span className="block font-display text-2xl font-extrabold leading-none">{d.label}</span>
                          {d.note && <span className="mt-1 block text-xs font-semibold text-warn-fg">{d.note}</span>}
                        </td>
                        <td className={`px-5 py-4 text-right font-bold ${price ? "" : "text-text2"}`}>{price ?? "See organiser"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-text2">Fees as published by the organiser. Always confirm on the official page.</p>
          </Section>

          {event.highlights.length > 0 && (
            <Section title="Good to know">
              <ul className="grid gap-3 sm:grid-cols-2">
                {event.highlights.map((h) => (
                  <li key={h} className="flex gap-3 rounded-xl bg-surface p-4 text-[15px] leading-snug text-body">
                    <Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-icon" />
                    {h}
                  </li>
                ))}
              </ul>
              {event.walkerFriendly !== null && (
                <p className="text-sm text-text2">Walker-friendly: {event.walkerFriendly ? "Yes" : "No — this is a timed challenge"}</p>
              )}
            </Section>
          )}

          <Section title="Route">
            <div className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-dash p-4 text-center text-text2">
              <Icon name="map" size={28} strokeWidth={1.8} />
              <span className="font-semibold">Route map not published</span>
              <span className="text-sm">We&apos;ll add it when the organiser shares it.</span>
            </div>
          </Section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {event.organiser && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-hero text-sm font-extrabold text-volt">
                {initials(event.organiser)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] font-bold tracking-[0.08em] text-text2">HOSTED BY</span>
                <span className="font-bold">{event.organiser}</span>
                <span className="text-xs text-text2">
                  {organiserCount} {organiserCount === 1 ? "race" : "races"} listed
                </span>
              </span>
            </div>
          )}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="text-[11px] font-bold tracking-[0.08em] text-text2">VENUE</span>
            <span className="font-semibold">{locationLabel(event)}</span>
            {map ? (
              <a href={map} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-tile text-sm font-bold">
                <Icon name="map" size={18} /> Open in Google Maps
              </a>
            ) : (
              <span className="text-sm text-text2">The organiser hasn&apos;t published the venue yet.</span>
            )}
          </div>
          <p className="px-1 text-xs leading-relaxed text-text2">
            Something wrong with this listing? Tell the Stride GH team and we&apos;ll fix it.
          </p>
        </aside>
      </Container>

      {others.length > 0 && (
        <Container as="section" className="pt-16">
          <SectionHeading
            title={sameMonth.length ? `Other races in ${formatDate.monthName(event.date)}` : "More upcoming races"}
            action={{ href: "/events", label: "All races" }}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.slice(0, 3).map((e) => (
              <RaceCard key={e.slug} event={e} today={today} />
            ))}
          </div>
        </Container>
      )}

      <RegisterBar {...register} />
    </main>
  );
}

/** Shown at the top of a past race's page. */
function PastBanner({ date, next }: { date: string; next: RaceEvent | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon name="flag" size={18} />
        </span>
        <span>
          <span className="block font-display text-2xl font-extrabold uppercase leading-none">Race over</span>
          <span className="mt-1 block text-sm text-white/75">
            This race took place on {formatDate.long(date)}. Registration is closed.
          </span>
        </span>
      </div>
      {next ? (
        <Link
          href={`/events/${next.slug}`}
          className="flex h-11 shrink-0 items-center gap-2 self-start rounded-xl bg-volt px-4 text-sm font-bold text-night sm:self-auto"
        >
          Next edition: {formatDate.short(next.date)} {next.date.slice(0, 4)} <Icon name="arrow" size={16} />
        </Link>
      ) : (
        <Link
          href="/events"
          className="flex h-11 shrink-0 items-center gap-2 self-start rounded-xl border border-white/30 px-4 text-sm font-bold hover:bg-white/10 sm:self-auto"
        >
          See upcoming races <Icon name="arrow" size={16} />
        </Link>
      )}
    </div>
  );
}

/** Stand-in poster built from the race details, for races without an organiser poster. */
function TypographicPoster({ event }: { event: RaceEvent }) {
  return (
    <div
      role="img"
      aria-label={`Poster for ${event.name}`}
      className="relative flex aspect-square w-full max-w-[420px] flex-col justify-between overflow-hidden rounded-2xl bg-night p-7 text-[#f4f2ec] shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
    >
      <span aria-hidden className="outline-numeral absolute -bottom-12 -right-4 text-[260px]">
        {coverNumeral(event)}
      </span>
      <span className="relative text-[11px] font-bold tracking-[0.14em] text-volt">
        {formatDate.weekday(event.date)} {formatDate.day(event.date)} {formatDate.month(event.date)}
      </span>
      <span className="relative max-w-[320px] font-display text-[56px] font-extrabold uppercase leading-[0.88]">{event.name}</span>
      <span className="relative max-w-[200px] text-xs font-semibold text-[#b9c2bd]">{distanceSummary(event.distances)}</span>
    </div>
  );
}

function Fact({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-surface px-4 py-3.5">
      <dt className="text-[11px] font-bold tracking-[0.08em] text-text2">{label.toUpperCase()}</dt>
      <dd className={`font-semibold ${muted ? "text-text2" : ""}`}>{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-4xl font-extrabold uppercase leading-none">{title}</h2>
      {children}
    </section>
  );
}

function initials(name: string) {
  return name
    .replace(/^The /, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}
