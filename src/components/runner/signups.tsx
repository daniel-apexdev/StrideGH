"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAccount } from "@/lib/accounts/use-account";
import { joinWaitlist, myAlert, removeAlert, RunnerError, saveAlert, unsubscribe, type Alert } from "@/lib/runner/client";
import { emailLooksValid } from "@/lib/runner/core";
import { Icon } from "../icon";

const btn = "flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 font-bold disabled:opacity-60";
const message = (e: unknown) => (e instanceof RunnerError ? e.message : "Something went wrong. Please try again.");

const distanceOptions = [
  ["5K", "5K"],
  ["10K", "10K"],
  ["Half", "Half marathon"],
  ["Marathon", "Marathon"],
  ["Other", "Other distances"],
] as const;

/**
 * "Tell me when new races are listed": pick distances and towns (none = any). Visitors just leave
 * an email; signed-in runners can come back and change their choices.
 */
export function NewRaceAlerts({ cities, tone = "plain" }: { cities: string[]; tone?: "plain" | "hero" }) {
  const account = useAccount();
  const signedIn = account.status === "signed-in";
  const [existing, setExisting] = useState<Alert | null | undefined>(undefined);
  const [distances, setDistances] = useState<string[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "saved" | "exists">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (account.status !== "signed-in") return;
    let live = true;
    myAlert(account.supabase).then(
      (a) => {
        if (!live) return;
        setExisting(a);
        if (a) {
          setDistances(a.distances);
          setTowns(a.cities);
        }
      },
      () => live && setExisting(null),
    );
    return () => {
      live = false;
    };
  }, [account]);

  if (account.status === "loading" || account.status === "off") return null;
  const hero = tone === "hero";
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (account.status === "loading" || account.status === "off") return;
    const addr = account.status === "signed-in" ? (account.user.email ?? "") : email;
    if (!emailLooksValid(addr)) return setError("Enter a valid email address.");
    setError(null);
    setState("busy");
    try {
      const result = await saveAlert(
        account.supabase,
        { email: addr, distances, cities: towns },
        account.status === "signed-in" ? { userId: account.user.id, existingId: existing?.id ?? null } : undefined,
      );
      setState(result);
      if (account.status === "signed-in" && result === "saved") setExisting(await myAlert(account.supabase).catch(() => null));
    } catch (err) {
      setError(message(err));
      setState("idle");
    }
  }

  const chip = (on: boolean) =>
    `flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition ${
      on
        ? hero
          ? "border-volt bg-volt text-night"
          : "border-sel bg-sel text-on-sel"
        : hero
          ? "border-white/25 hover:bg-white/10"
          : "border-line bg-surface hover:bg-tile"
    }`;

  if (state === "saved" || state === "exists")
    return (
      <div className={`flex items-start gap-3 rounded-2xl p-5 ${hero ? "bg-white/10" : "bg-ok-bg text-ok-fg"}`}>
        <Icon name="check" size={22} strokeWidth={2.6} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">{state === "saved" ? "Alerts are on." : "This email already gets alerts."}</p>
          <p className="mt-1 text-sm">
            {state === "saved"
              ? "We'll email you when a race that matches is listed. Each email has a link to stop them."
              : "To change what you get, sign in with that email, or use the link at the bottom of any alert."}
          </p>
          {signedIn && (
            <button type="button" onClick={() => setState("idle")} className="mt-2 text-sm font-semibold underline">
              Change my alerts
            </button>
          )}
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 text-xs font-bold tracking-[0.1em] ${hero ? "text-on-hero2" : "text-text2"}`}>DISTANCES (NONE = ANY)</legend>
        <div className="flex flex-wrap gap-2">
          {distanceOptions.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={distances.includes(value)} onClick={() => setDistances((d) => toggle(d, value))} className={chip(distances.includes(value))}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {cities.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className={`mb-2 text-xs font-bold tracking-[0.1em] ${hero ? "text-on-hero2" : "text-text2"}`}>TOWNS (NONE = ANYWHERE)</legend>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <button key={c} type="button" aria-pressed={towns.includes(c)} onClick={() => setTowns((t) => toggle(t, c))} className={chip(towns.includes(c))}>
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        {signedIn ? (
          <span className={`flex h-12 min-w-0 flex-1 items-center truncate rounded-xl px-4 ${hero ? "bg-white/10" : "bg-soft"}`}>
            {account.user.email}
          </span>
        ) : (
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`h-12 min-w-0 flex-1 rounded-xl border px-4 text-base outline-none ${
              hero ? "border-white/20 bg-white text-night" : "border-line bg-surface focus:border-ink"
            }`}
          />
        )}
        <button type="submit" disabled={state === "busy"} className={`${btn} ${hero ? "bg-volt text-night" : "bg-primary text-on-primary"}`}>
          {state === "busy" ? "Saving…" : existing ? "Update alerts" : "Get alerts"}
        </button>
      </div>
      {error && <p className={`text-sm font-semibold ${hero ? "text-volt" : "text-danger"}`}>{error}</p>}
      {existing && (
        <button
          type="button"
          onClick={async () => {
            if (account.status !== "signed-in") return;
            await removeAlert(account.supabase, existing.id).catch(() => {});
            setExisting(null);
            setDistances([]);
            setTowns([]);
          }}
          className="self-start text-sm font-semibold underline"
        >
          Stop all new-race alerts
        </button>
      )}
    </form>
  );
}

/** Homepage: "Tell me when the app is out." */
export function AppWaitlist() {
  const account = useAccount();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const signedInEmail = account.status === "signed-in" ? (account.user.email ?? "") : "";

  if (account.status === "off") return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (account.status !== "signed-in" && account.status !== "signed-out") return;
    const addr = signedInEmail || email;
    if (!emailLooksValid(addr)) return setError("Enter a valid email address.");
    setError(null);
    setState("busy");
    try {
      await joinWaitlist(account.supabase, addr);
      setState("done");
    } catch (err) {
      setError(message(err));
      setState("idle");
    }
  }

  if (state === "done")
    return (
      <p className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 font-semibold">
        <Icon name="check" size={22} strokeWidth={2.6} className="shrink-0 text-volt" />
        You&apos;re on the list. We&apos;ll email you the day the app is out.
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {signedInEmail ? (
          <span className="flex h-12 min-w-0 flex-1 items-center truncate rounded-xl bg-white/10 px-4">{signedInEmail}</span>
        ) : (
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl bg-white px-4 text-base text-night outline-none"
          />
        )}
        <button type="submit" disabled={state === "busy" || account.status === "loading"} className={`${btn} bg-volt text-night`}>
          {state === "busy" ? "Adding…" : "Tell me when it's out"}
        </button>
      </div>
      {error && <p className="text-sm font-semibold text-volt">{error}</p>}
      <p className="text-xs text-on-hero2">One email when the app launches. Nothing else.</p>
    </form>
  );
}

/** /unsubscribe?t=… from the link in a reminder or alert email. */
export function UnsubscribeLive() {
  const token = useSearchParams().get("t") ?? "";
  const account = useAccount();
  const [result, setResult] = useState<"reminder" | "alerts" | "none" | "error" | null>(null);
  const valid = /^[0-9a-f-]{36}$/i.test(token);

  useEffect(() => {
    if (!valid || (account.status !== "signed-in" && account.status !== "signed-out")) return;
    let live = true;
    unsubscribe(account.supabase, token).then(
      (r) => live && setResult(r),
      () => live && setResult("error"),
    );
    return () => {
      live = false;
    };
  }, [account, token, valid]);

  const text = !valid
    ? "This link isn't complete. Copy the whole link from the email, or sign in to manage your emails."
    : account.status === "off"
      ? "Email preferences aren't available right now. Please try again later."
      : result === null
        ? "Stopping those emails…"
        : result === "reminder"
          ? "Done: you won't get any more reminders for that race."
          : result === "alerts"
            ? "Done: new-race alerts are off for your email."
            : result === "none"
              ? "These emails were already stopped."
              : "Something went wrong. Please try the link again in a minute.";

  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6">
      <p className="text-lg font-semibold">{text}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/events" className="flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-on-primary">
          Browse races
        </Link>
        <Link href="/account" className="flex h-11 items-center rounded-xl border border-line px-4 text-sm font-bold">
          Manage emails in your account
        </Link>
      </div>
    </div>
  );
}
