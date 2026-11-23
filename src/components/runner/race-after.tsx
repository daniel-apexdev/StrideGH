"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import type { RaceEvent } from "@/lib/events/types";
import { deleteReview, getEntry, raceReviews, RunnerError, saveEntry, saveReview } from "@/lib/runner/client";
import {
  entryFor,
  formatFinishTime,
  pacePerKm,
  parseFinishTime,
  publicName,
  reviewAspects,
  reviewSummary,
  type RaceEntry,
  type Review,
} from "@/lib/runner/core";

const btn = "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60";
const field = "h-11 min-w-0 rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none focus:border-ink";
const message = (e: unknown) => (e instanceof RunnerError ? e.message : "Something went wrong. Please try again.");

/** Past races: "Did you run it?" Log a finish time, which feeds race history and Year in running. */
export function RaceResult({ event }: { event: RaceEvent }) {
  const account = useAccount();
  if (account.status === "loading" || account.status === "off") return null;
  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div>
        <h2 id="result-title" className="font-display text-3xl font-extrabold uppercase leading-none">
          Did you run it?
        </h2>
        <p className="mt-1.5 text-sm text-text2">Log your time to build your race history and your Year in running.</p>
      </div>
      {account.status === "signed-in" ? (
        <ResultForm event={event} account={account} />
      ) : (
        <Link href={`/signin?next=${encodeURIComponent(`/events/${event.slug}`)}`} className={`${btn} self-start bg-ink text-on-ink`}>
          Sign in to log your time
        </Link>
      )}
    </section>
  );
}

type Signed = Extract<ReturnType<typeof useAccount>, { status: "signed-in" }>;

function ResultForm({ event, account }: { event: RaceEvent; account: Signed }) {
  const [entry, setEntry] = useState<RaceEntry | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [distance, setDistance] = useState(event.distances[0].label);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getEntry(account.supabase, event.slug).then(
      (e) => {
        if (!live) return;
        setEntry(e);
        if (e?.distance_label) setDistance(e.distance_label);
        if (e?.finish_seconds) setTime(formatFinishTime(e.finish_seconds));
      },
      () => live && setEntry(null),
    );
    return () => {
      live = false;
    };
  }, [account.supabase, event.slug]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const seconds = time.trim() ? parseFinishTime(time) : null;
    if (time.trim() && !seconds) return setError("Write your time like 58:20 or 1:02:05.");
    const d = event.distances.find((x) => x.label === distance) ?? event.distances[0];
    setBusy(true);
    setError(null);
    try {
      setEntry(await saveEntry(account.supabase, account.user.id, { ...entryFor(event, d), finish_seconds: seconds }));
      setEditing(false);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  if (entry === undefined) return <div className="h-16 animate-pulse rounded-xl bg-tile" />;

  if (entry?.finish_seconds && !editing) {
    const pace = entry.distance_km ? pacePerKm(entry.finish_seconds, Number(entry.distance_km)) : null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ok-bg p-4 text-ok-fg">
        <div className="flex items-center gap-4">
          <span className="font-display text-5xl font-extrabold leading-none">{formatFinishTime(entry.finish_seconds)}</span>
          <span className="text-sm">
            <span className="block font-bold">{entry.distance_label}</span>
            {pace && <span className="block">{pace}</span>}
          </span>
        </div>
        <span className="flex gap-3 text-sm font-semibold">
          <button type="button" onClick={() => setEditing(true)} className="underline">
            Edit
          </button>
          <Link href="/year" className="underline">
            Your year
          </Link>
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {event.distances.length > 1 && (
          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            Distance
            <select value={distance} onChange={(e) => setDistance(e.target.value)} className={field}>
              {event.distances.map((d) => (
                <option key={d.label}>{d.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
          Finish time
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="58:20 or 1:02:05"
            inputMode="numeric"
            className={field}
          />
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={`${btn} bg-primary text-on-primary`}>
          {busy ? "Saving…" : entry ? "Save my time" : "I ran it"}
        </button>
        <span className="text-xs text-text2">No time? Leave it blank: the race still counts.</span>
      </div>
    </form>
  );
}

// Reviews -----------------------------------------------------------------------------------

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span aria-label={`${value} out of 5`} className="inline-flex gap-0.5 text-[#e0a100]">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"
            fill={i <= Math.round(value) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function StarInput({ label, value, onChange, required }: { label: string; value: number | null; onChange: (v: number | null) => void; required?: boolean }) {
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="float-left text-sm font-semibold">
        {label}
        {!required && <span className="font-normal text-text2"> (optional)</span>}
      </legend>
      <span className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            aria-pressed={value === i}
            onClick={() => onChange(!required && value === i ? null : i)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${value && i <= value ? "text-[#e0a100]" : "text-line"} hover:bg-tile`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" fill="currentColor" />
            </svg>
          </button>
        ))}
      </span>
    </fieldset>
  );
}

/** Past races: what runners thought, and a review form for signed-in runners. */
export function RaceReviews({ event }: { event: RaceEvent }) {
  const account = useAccount();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [writing, setWriting] = useState(false);
  const supabase = account.status === "signed-in" || account.status === "signed-out" ? account.supabase : null;

  useEffect(() => {
    if (!supabase) return;
    let live = true;
    raceReviews(supabase, event.slug).then(
      (r) => live && setReviews(r),
      () => live && setReviews([]),
    );
    return () => {
      live = false;
    };
  }, [supabase, event.slug]);

  if (account.status === "loading" || account.status === "off") return null;
  const mine = account.status === "signed-in" ? reviews?.find((r) => r.user_id === account.user.id) : undefined;
  const summary = reviewSummary(reviews ?? []);

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="reviews-title" className="font-display text-4xl font-extrabold uppercase leading-none">
            Runners&apos; reviews
          </h2>
          {summary.overall !== null && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Stars value={summary.overall} /> <strong>{summary.overall}</strong>
              <span className="text-text2">
                from {summary.count} runner{summary.count === 1 ? "" : "s"}
              </span>
            </p>
          )}
        </div>
        {account.status === "signed-in" && !writing && (
          <button type="button" onClick={() => setWriting(true)} className={`${btn} border border-line hover:bg-tile`}>
            {mine ? "Edit your review" : "Review this race"}
          </button>
        )}
      </div>

      {summary.count > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summary.aspects.map((a) => (
            <div key={a.key} className="rounded-xl bg-surface p-3">
              <dt className="text-xs font-semibold text-text2">{a.label}</dt>
              <dd className="mt-1 font-display text-2xl font-extrabold">{a.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      )}

      {writing && account.status === "signed-in" && (
        <ReviewForm
          event={event}
          account={account}
          mine={mine}
          onDone={(next) => {
            setWriting(false);
            if (next) setReviews(next);
          }}
        />
      )}

      {reviews === null ? (
        <div className="h-24 animate-pulse rounded-2xl bg-tile" />
      ) : reviews.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-dash p-5 text-sm text-text2">
          No reviews yet.{" "}
          {account.status === "signed-in" ? (
            "Ran it? Be the first to say how it went."
          ) : (
            <Link href={`/signin?next=${encodeURIComponent(`/events/${event.slug}`)}`} className="font-semibold text-link">
              Sign in to write the first one.
            </Link>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.slice(0, 20).map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{r.reviewer_name}</span>
                <Stars value={r.overall} size={14} />
              </div>
              {r.comment && <p className="mt-2 text-[15px] leading-relaxed text-body">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewForm({
  event,
  account,
  mine,
  onDone,
}: {
  event: RaceEvent;
  account: Signed;
  mine: Review | undefined;
  onDone: (reviews?: Review[]) => void;
}) {
  const [overall, setOverall] = useState<number | null>(mine?.overall ?? null);
  const [aspects, setAspects] = useState<Record<string, number | null>>({
    course: mine?.course ?? null,
    organisation: mine?.organisation ?? null,
    water: mine?.water ?? null,
    medal: mine?.medal ?? null,
  });
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profile = profileOf(account.user);
  const name = publicName(profile.name, profile.email);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!overall) return setError("Give the race an overall rating.");
    setBusy(true);
    setError(null);
    try {
      await saveReview(account.supabase, account.user.id, event.slug, {
        reviewer_name: name,
        overall,
        course: aspects.course,
        organisation: aspects.organisation,
        water: aspects.water,
        medal: aspects.medal,
        comment: comment.trim() || null,
      });
      onDone(await raceReviews(account.supabase, event.slug));
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <StarInput label="Overall" value={overall} onChange={setOverall} required />
      {reviewAspects.map(([key, label]) => (
        <StarInput key={key} label={label} value={aspects[key]} onChange={(v) => setAspects((a) => ({ ...a, [key]: v }))} />
      ))}
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        What should other runners know? <span className="font-normal text-text2">(optional)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 600))}
          rows={4}
          className="rounded-xl border border-line bg-surface p-3 text-[15px] font-normal outline-none focus:border-ink"
          placeholder="Course, start time, water stations, parking, the medal…"
        />
        <span className="self-end text-xs font-normal text-text2">{comment.length}/600</span>
      </label>
      <p className="text-xs text-text2">
        Shown as <strong>{name}</strong>. Be fair and specific; organisers read these too.
      </p>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={`${btn} bg-primary text-on-primary`}>
          {busy ? "Saving…" : mine ? "Update review" : "Post review"}
        </button>
        <button type="button" onClick={() => onDone()} className={`${btn} border border-line`}>
          Cancel
        </button>
        {mine && (
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              await deleteReview(account.supabase, event.slug).catch(() => {});
              onDone(await raceReviews(account.supabase, event.slug).catch(() => []));
            }}
            className="ml-auto text-sm font-semibold text-danger underline"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
