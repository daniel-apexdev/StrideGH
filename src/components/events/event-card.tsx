import Image from "next/image";
import Link from "next/link";
import type { RaceEvent } from "@/lib/events/types";
import { countdown, coverNumeral, distanceSummary, feeLabel, formatDate, locationLabel, raceStatus, type RaceStatus } from "@/lib/events/format";
import { VerificationBadge } from "./verification-badge";

/** Vertical card for race grids on the website: cover (poster or typographic), date, name, place, distances, fee. */
export function RaceCard({ event, today, priority }: { event: RaceEvent; today: string; priority?: boolean }) {
  const status = raceStatus(event, today);
  const past = status === "past";
  return (
    <Link
      href={`/events/${event.slug}`}
      aria-label={past ? `${event.name} (race over)` : undefined}
      className={`group flex flex-col overflow-hidden rounded-2xl border transition ${
        past
          ? "border-line bg-soft hover:border-line2"
          : "border-line bg-surface hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)]"
      }`}
    >
      <div className={`relative aspect-[4/3] overflow-hidden ${past ? "grayscale" : ""}`} style={{ background: event.coverColor }}>
        {event.poster ? (
          <>
            <Image
              src={event.poster.src}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
          </>
        ) : (
          <span aria-hidden className="outline-numeral absolute -bottom-10 -right-3 text-[170px] opacity-80">
            {coverNumeral(event)}
          </span>
        )}
        <span className="absolute left-3 top-3 flex flex-col items-center rounded-[10px] bg-white px-2.5 py-1.5 leading-none text-night shadow">
          <span className="text-[10px] font-bold text-[#5a635e]">{formatDate.month(event.date)}</span>
          <span className="font-display text-[26px] font-extrabold">{formatDate.day(event.date)}</span>
          <span className="text-[10px] font-bold text-[#5a635e]">{formatDate.weekday(event.date)}</span>
        </span>
        {past && <span aria-hidden className="absolute inset-0 bg-black/45" />}
        <StatusChip status={status} date={event.date} today={today} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className={`font-display text-[24px] font-bold leading-[1.02] group-hover:underline ${past ? "text-text2" : ""}`}>{event.name}</span>
        <span className="text-[13px] text-text2">{locationLabel(event)}</span>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className="rounded-md bg-soft px-2 py-1 text-xs font-bold">{distanceSummary(event.distances)}</span>
          <span className="text-[13px] font-semibold">{feeLabel(event)}</span>
        </div>
        <VerificationBadge event={event} today={today} />
      </div>
    </Link>
  );
}

/** Horizontal card used in compact lists. */
export function EventCard({ event, today }: { event: RaceEvent; today: string }) {
  const status = raceStatus(event, today);
  const past = status === "past";
  return (
    <Link href={`/events/${event.slug}`} className={`flex gap-3 rounded-[14px] border border-line p-2.5 ${past ? "bg-soft" : "bg-surface"}`}>
      <div
        className={`relative flex h-[120px] w-[92px] shrink-0 flex-col overflow-hidden rounded-[10px] p-2 leading-none text-[#f4f2ec] ${past ? "grayscale" : ""}`}
        style={{ background: event.coverColor }}
      >
        {event.poster && <PosterFill src={event.poster.src} sizes="92px" />}
        {past && <span aria-hidden className="absolute inset-0 bg-black/45" />}
        <span className="relative font-display text-[26px] font-extrabold">{formatDate.day(event.date)}</span>
        <span className="relative text-[10px] font-bold text-volt">{formatDate.month(event.date)}</span>
        {!event.poster && (
          <span aria-hidden className="outline-numeral absolute -bottom-2.5 left-1.5 text-[50px] [-webkit-text-stroke-width:1px]">
            {coverNumeral(event)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`text-[11px] font-bold uppercase tracking-[0.06em] ${past ? "text-text2" : "text-link"}`}>
          {formatDate.short(event.date)} · {past ? "Race over" : countdown(event.date, today)}
        </span>
        <span className={`font-display text-[21px] font-bold leading-[1.05] ${past ? "text-text2" : ""}`}>{event.name}</span>
        <span className="text-xs text-text2">{locationLabel(event)}</span>
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <span className="rounded-[5px] bg-soft px-1.5 py-[3px] text-[11px] font-bold">{distanceSummary(event.distances)}</span>
          <span className="text-xs font-semibold">{feeLabel(event)}</span>
        </div>
        <VerificationBadge event={event} today={today} />
      </div>
    </Link>
  );
}

/** Compact date-led row used on the home page. */
export function EventRow({ event }: { event: RaceEvent }) {
  return (
    <Link href={`/events/${event.slug}`} className="flex items-center gap-3.5 border-b border-line py-3.5">
      <div className="flex w-12 flex-col items-center leading-none">
        <span className="font-display text-[30px] font-extrabold">{formatDate.day(event.date)}</span>
        <span className="text-[11px] font-bold text-text2">{formatDate.month(event.date)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[15px] font-semibold">{event.name}</span>
        <span className="text-[13px] text-text2">
          {distanceSummary(event.distances)} · {feeLabel(event)}
        </span>
      </div>
    </Link>
  );
}

/** Square tile used for "other races" carousels. */
export function EventTile({ event }: { event: RaceEvent }) {
  return (
    <Link href={`/events/${event.slug}`} className="flex w-[150px] shrink-0 flex-col gap-1.5">
      <div
        className="relative flex h-[150px] w-[150px] flex-col overflow-hidden rounded-xl p-2.5 leading-none text-[#f4f2ec]"
        style={{ background: event.coverColor }}
      >
        {event.poster && <PosterFill src={event.poster.src} sizes="150px" />}
        <span className="relative font-display text-[28px] font-extrabold">{formatDate.day(event.date)}</span>
        <span className="relative text-[10px] font-bold text-volt">{formatDate.month(event.date)}</span>
        {!event.poster && (
          <span aria-hidden className="outline-numeral absolute -bottom-4 -right-1.5 text-[80px] [-webkit-text-stroke-width:1px]">
            {coverNumeral(event)}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold leading-tight">{event.name}</span>
      <span className="text-xs text-text2">
        {distanceSummary(event.distances)} · {feeLabel(event)}
      </span>
    </Link>
  );
}

/** Top-corner chip: countdown, "Race day", or "Race over". */
export function StatusChip({ status, date, today, className = "" }: { status: RaceStatus; date: string; today: string; className?: string }) {
  if (status === "past")
    return (
      <span className={`flex items-center gap-1.5 rounded-md bg-night/90 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-white ${className}`}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white/60" />
        Race over
      </span>
    );
  if (status === "today")
    return (
      <span className={`flex items-center gap-1.5 rounded-md bg-volt px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-night ${className}`}>
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-night" />
        Race day
      </span>
    );
  return <span className={`rounded-md bg-volt px-2 py-1 text-[11px] font-bold text-night ${className}`}>{countdown(date, today)}</span>;
}

/**
 * Poster as a thumbnail background. Small tiles crop it (the race page shows it whole),
 * with a dark wash at the top so the date stays readable on any artwork.
 */
function PosterFill({ src, sizes }: { src: string; sizes: string }) {
  return (
    <>
      <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-transparent" />
    </>
  );
}
