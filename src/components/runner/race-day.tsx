"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import { formatDate } from "@/lib/events/format";
import type { RaceEvent } from "@/lib/events/types";
import { addReminder, getEntry, removeEntry, removeReminder, RunnerError, saveEntry } from "@/lib/runner/client";
import { emailLooksValid, entryFor, type RaceEntry } from "@/lib/runner/core";
import { Icon } from "../icon";

const btn = "flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60";
const field = "h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3.5 text-[15px] outline-none focus:border-ink";

/** Reminder schedule shown to runners, in the order they arrive. */
function reminderList(event: RaceEvent) {
  return [
    ...(event.registration.closes ? [`3 days before registration closes (${formatDate.short(event.registration.closes)})`] : []),
    "A week before race day",
    "The day before, with a race-day checklist",
    "After the race, with results and photos",
  ];
}

/**
 * For upcoming races: "I'm running this" (signed-in runners, feeds their race history and Year in
 * running) and reminder emails (anyone, with or without an account).
 */
export function RaceDayCard({ event }: { event: RaceEvent }) {
  const account = useAccount();
  if (account.status === "loading" || account.status === "off") return null;
  return (
    <section aria-labelledby="race-day-title" className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 md:p-6">
      <div>
        <h2 id="race-day-title" className="font-display text-3xl font-extrabold uppercase leading-none">
          Running this race?
        </h2>
        <p className="mt-1.5 text-sm text-text2">Never miss the registration deadline or race-day details.</p>
      </div>
      {account.status === "signed-in" ? (
        <Running event={event} account={account} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-soft p-4">
          <span className="text-sm">
            <strong>Sign in</strong> to add it to your races and log your time afterwards.
          </span>
          <Link href={`/signin?next=${encodeURIComponent(`/events/${event.slug}`)}`} className={`${btn} bg-ink text-on-ink`}>
            Sign in or join
          </Link>
        </div>
      )}
      <Reminders event={event} account={account} />
    </section>
  );
}

type Signed = Extract<ReturnType<typeof useAccount>, { status: "signed-in" }>;
type Known = Extract<ReturnType<typeof useAccount>, { status: "signed-in" | "signed-out" }>;

function Running({ event, account }: { event: RaceEvent; account: Signed }) {
  const [entry, setEntry] = useState<RaceEntry | null | undefined>(undefined);
  const [choosing, setChoosing] = useState(false);
  const [distance, setDistance] = useState(event.distances[0].label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getEntry(account.supabase, event.slug).then(
      (e) => live && setEntry(e),
      () => live && setEntry(null),
    );
    return () => {
      live = false;
    };
  }, [account.supabase, event.slug]);

  async function save() {
    const d = event.distances.find((x) => x.label === distance) ?? event.distances[0];
    setBusy(true);
    setError(null);
    try {
      setEntry(await saveEntry(account.supabase, account.user.id, entryFor(event, d)));
      // Runners who say they're running also get the reminder emails.
      if (account.user.email) await addReminder(account.supabase, account.user.email, event.slug, account.user.id).catch(() => {});
      setChoosing(false);
    } catch (e) {
      setError(e instanceof RunnerError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await removeEntry(account.supabase, event.slug);
      setEntry(null);
    } catch (e) {
      setError(e instanceof RunnerError ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (entry === undefined) return <div className="h-16 animate-pulse rounded-xl bg-tile" />;

  if (entry && !choosing)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ok-bg p-4 text-ok-fg">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-volt text-night">
            <Icon name="check" size={18} strokeWidth={2.6} />
          </span>
          <span>
            <span className="block font-bold">You&apos;re running the {entry.distance_label}</span>
            <span className="block text-xs">It&apos;s in your races. Log your time here after race day.</span>
          </span>
        </span>
        <span className="flex gap-2">
          {event.distances.length > 1 && (
            <button type="button" onClick={() => (setDistance(entry.distance_label ?? distance), setChoosing(true))} className="text-sm font-semibold underline">
              Change
            </button>
          )}
          <button type="button" onClick={remove} disabled={busy} className="text-sm font-semibold underline">
            Not running
          </button>
        </span>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {event.distances.length > 1 && (
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="sr-only">Distance</span>
            <select value={distance} onChange={(e) => setDistance(e.target.value)} className={field}>
              {event.distances.map((d) => (
                <option key={d.label} value={d.label}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" onClick={save} disabled={busy} className={`${btn} bg-primary text-on-primary`}>
          <Icon name="flag" size={16} /> {busy ? "Saving…" : event.distances.length > 1 ? "I'm running this distance" : "I'm running this"}
        </button>
      </div>
      <p className="text-xs text-text2">
        Register on the organiser&apos;s official page too: this only adds it to your Stride GH races
        {profileOf(account.user).name ? `, ${profileOf(account.user).name.split(" ")[0]}` : ""}.
      </p>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}

function Reminders({ event, account }: { event: RaceEvent; account: Known }) {
  const signedIn = account.status === "signed-in";
  const myEmail = signedIn ? (account.user.email ?? "") : "";
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const addr = signedIn ? myEmail : email;
    if (!emailLooksValid(addr)) return setError("Enter a valid email address.");
    setBusy(true);
    setError(null);
    try {
      await addReminder(account.supabase, addr, event.slug, signedIn ? account.user.id : undefined);
      setDone(addr.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof RunnerError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4">
        <span className="flex items-center gap-2.5 text-sm">
          <Icon name="message" size={18} className="text-icon" />
          <span>
            Reminders on for <strong>{done}</strong>.
          </span>
        </span>
        {signedIn && (
          <button
            type="button"
            onClick={async () => {
              await removeReminder(account.supabase, event.slug).catch(() => {});
              setDone(null);
            }}
            className="text-sm font-semibold underline"
          >
            Stop
          </button>
        )}
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t border-line2 pt-5">
      <div>
        <h3 className="font-bold">Email me reminders</h3>
        <ul className="mt-1.5 grid gap-1 text-sm text-text2">
          {reminderList(event).map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-text2" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        {signedIn ? (
          <span className="flex h-11 min-w-0 flex-1 items-center truncate rounded-xl bg-soft px-3.5 text-[15px]">{myEmail}</span>
        ) : (
          <>
            <label htmlFor={`rem-${event.slug}`} className="sr-only">
              Email
            </label>
            <input
              id={`rem-${event.slug}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
            />
          </>
        )}
        <button type="submit" disabled={busy} className={`${btn} bg-ink text-on-ink`}>
          {busy ? "Saving…" : "Remind me"}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <p className="text-xs text-text2">No account needed. Every email has a link to stop them.</p>
    </form>
  );
}
