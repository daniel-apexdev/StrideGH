"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/events/format";
import type { PublicSubmission } from "@/lib/submissions/public";
import { MINE_KEY, RESUBMIT_KEY } from "./list-form";

type Mine = { reference: string; email: string; name: string };
const input = "h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base";

const tone: Record<PublicSubmission["status"], string> = {
  pending: "bg-warn-bg text-warn-fg",
  changes_requested: "bg-neu-bg text-neu-fg",
  approved: "bg-ok-bg text-ok-fg",
  rejected: "bg-neu-bg text-neu-fg",
};

const explain: Record<PublicSubmission["status"], string> = {
  pending: "We're checking the details against your official page. This usually takes up to 2 working days.",
  changes_requested: "We need a few changes before this can go live. See the note below, then edit and send it back.",
  approved: "Your race is live on Stride GH.",
  rejected: "We couldn't list this race. The note below explains why.",
};

async function lookup(reference: string, email: string): Promise<PublicSubmission> {
  const res = await fetch(`/api/submissions/${encodeURIComponent(reference.trim().toUpperCase())}?email=${encodeURIComponent(email.trim())}`, {
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Couldn't check that submission.");
  return json.submission;
}

export function StatusLookup() {
  const params = useSearchParams();
  const router = useRouter();
  const [reference, setReference] = useState(params.get("ref") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [result, setResult] = useState<PublicSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Mine[]>([]);

  const check = useCallback(async (ref: string, mail: string) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await lookup(ref, mail));
    } catch (e) {
      setResult(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from browser storage
      setMine(JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]"));
    } catch {}
    const ref = params.get("ref");
    const mail = params.get("email");
    if (ref && mail) void check(ref, mail);
  }, [params, check]);

  return (
    <div className="flex flex-col gap-5">
      {mine.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-bold tracking-[0.1em] text-text2">SENT FROM THIS DEVICE</h2>
          {mine.map((m) => (
            <button
              key={m.reference}
              type="button"
              onClick={() => {
                setReference(m.reference);
                setEmail(m.email);
                void check(m.reference, m.email);
              }}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-surface p-3.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate font-bold">{m.name}</span>
                <span className="text-xs text-text2">{m.reference}</span>
              </span>
              <span className="text-sm font-bold text-link">Check</span>
            </button>
          ))}
        </section>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void check(reference, email);
        }}
        className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4"
      >
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Reference
          <input className={`${input} uppercase`} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SGH-XXXXXX" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Email you used
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <button disabled={busy} className="h-12 rounded-xl bg-primary font-bold text-on-primary disabled:opacity-60">
          {busy ? "Checking…" : "Check status"}
        </button>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
      </form>

      {result && (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-[16px] border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-text2">
                {result.reference} · {formatDate.short(result.raceDate)}
              </p>
              <p className="font-display text-2xl font-bold leading-tight">{result.raceName}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone[result.status]}`}>{result.statusLabel}</span>
          </div>
          <p className="text-sm text-body">{explain[result.status]}</p>
          {result.reviewerNote && (
            <div className="rounded-xl bg-soft p-3.5 text-sm">
              <p className="text-xs font-bold tracking-[0.08em] text-text2">FROM THE STRIDE GH TEAM</p>
              <p className="mt-1 whitespace-pre-line">{result.reviewerNote}</p>
            </div>
          )}
          {result.status === "approved" && result.publishedSlug && (
            <Link href={`/events/${result.publishedSlug}`} className="flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-on-primary">
              See your race
            </Link>
          )}
          {result.status === "changes_requested" && result.data && (
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(RESUBMIT_KEY, JSON.stringify({ reference: result.reference, data: result.data }));
                router.push("/list");
              }}
              className="h-11 rounded-xl bg-primary text-sm font-bold text-on-primary"
            >
              Edit and resubmit
            </button>
          )}
        </section>
      )}
    </div>
  );
}
