"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { profileOf, useAccount } from "@/lib/accounts/use-account";
import { countryByIso, emailProblem, formatPhone, parsePhone, phoneProblem } from "@/lib/contact";
import { Icon } from "../icon";
import { EmailField, PhoneField } from "../list/contact-fields";

/**
 * Website accounts. No passwords: we email a code to create the account (which also proves
 * the email is real), and again whenever someone signs in on a new browser.
 */
export function AccountPanel() {
  const account = useAccount();
  if (account.status === "loading") return <div className="h-72 animate-pulse rounded-2xl bg-tile" />;
  if (account.status === "off")
    return (
      <Card title="Your account">
        <p className="text-body">
          Website accounts are being set up. Until then, saved races stay in this browser, and you can create an account in the Stride GH app.
        </p>
      </Card>
    );
  if (account.status === "signed-in") return <SignedIn supabase={account.supabase} user={account.user} />;
  return <SignedOut supabase={account.supabase} />;
}

function Card({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const label = "text-sm font-semibold";
const primary = "flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-bold text-on-primary disabled:opacity-60";
const secondary = "flex h-12 items-center justify-center rounded-xl border border-line px-5 font-semibold hover:bg-tile";

/** Supabase's messages, in plain words. */
function friendly(err: { message?: string; status?: number; code?: string } | null): string {
  const m = (err?.message ?? "").toLowerCase();
  if (err?.status === 429 || m.includes("security purposes") || m.includes("rate limit"))
    return "Too many codes asked for. Wait a minute, then try again.";
  if (m.includes("signups not allowed") || m.includes("user not found") || err?.code === "otp_disabled")
    return "There's no account with this email yet. Create one instead.";
  if (m.includes("expired") || m.includes("invalid") || err?.code === "otp_expired")
    return "That code isn't right or has expired. Check the latest email, or send a new code.";
  if (m.includes("sending") || m.includes("smtp")) return "We couldn't send the email just now. Please try again shortly.";
  if (m.includes("fetch") || m.includes("network")) return "No connection. Check your internet and try again.";
  return "Something went wrong. Please try again.";
}

type Step = { kind: "details" } | { kind: "code"; email: string; sentAt: number };

function SignedOut({ supabase }: { supabase: SupabaseClient }) {
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [step, setStep] = useState<Step>({ kind: "details" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("GH");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(addr: string) {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options:
        mode === "create"
          ? { shouldCreateUser: true, data: { full_name: name.trim(), phone: formatPhone(countryByIso(country), phone) } }
          : { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) return setError(friendly(error));
    setStep({ kind: "code", email: addr, sentAt: Date.now() });
  }

  function submitDetails(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (mode === "create" && name.trim().length < 2) next.name = "Enter your name";
    const emailErr = emailProblem(email);
    if (emailErr) next.email = emailErr;
    if (mode === "create") {
      const p = phoneProblem(countryByIso(country), phone);
      if (p) next.phone = p;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    void sendCode(email.trim().toLowerCase());
  }

  if (step.kind === "code")
    return (
      <CodeStep
        supabase={supabase}
        email={step.email}
        sentAt={step.sentAt}
        creating={mode === "create"}
        details={{ full_name: name.trim(), phone: formatPhone(countryByIso(country), phone) }}
        resend={() => sendCode(step.email)}
        back={() => setStep({ kind: "details" })}
        busy={busy}
        sendError={error}
      />
    );

  const tab = (m: "create" | "signin", text: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => {
        setMode(m);
        setErrors({});
        setError(null);
      }}
      className={`h-10 flex-1 rounded-lg text-sm font-bold ${mode === m ? "bg-surface shadow-sm" : "text-text2"}`}
    >
      {text}
    </button>
  );

  return (
    <Card title={mode === "create" ? "Create your account" : "Sign in"}>
      <div role="tablist" aria-label="Account" className="flex max-w-sm gap-1 rounded-xl bg-tile p-1">
        {tab("create", "Create account")}
        {tab("signin", "Sign in")}
      </div>
      <p className="max-w-xl text-body">
        {mode === "create"
          ? "Save races across your devices and get race-day reminders. No password: we'll email you a code to confirm it's you."
          : "Enter the email you signed up with and we'll send you a sign-in code."}
      </p>
      <form onSubmit={submitDetails} noValidate className="grid max-w-xl gap-4">
        {mode === "create" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acc-name" className={label}>
              Full name
            </label>
            <input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-invalid={errors.name ? true : undefined}
              className={`h-12 rounded-xl border bg-surface px-3.5 text-base outline-none ${errors.name ? "border-danger" : "border-line"}`}
            />
            {errors.name && <p className="text-xs font-semibold text-danger">{errors.name}</p>}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="acc-email" className={label}>
            Email
          </label>
          <EmailField id="acc-email" value={email} onChange={setEmail} error={errors.email} />
        </div>
        {mode === "create" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acc-phone" className={label}>
              Phone number
            </label>
            <PhoneField id="acc-phone" country={country} number={phone} onCountry={setCountry} onNumber={setPhone} error={errors.phone} />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-fg">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${primary} sm:self-start`}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
      </form>
    </Card>
  );
}

const RESEND_SECONDS = 30;

function CodeStep({
  supabase,
  email,
  sentAt,
  creating,
  details,
  resend,
  back,
  busy,
  sendError,
}: {
  supabase: SupabaseClient;
  email: string;
  sentAt: number;
  creating: boolean;
  details: { full_name: string; phone: string };
  resend: () => void;
  back: () => void;
  busy: boolean;
  sendError: string | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(sentAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const wait = Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000));

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (code.length < 6) return setError("Enter the code from the email");
    setChecking(true);
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      setChecking(false);
      return setError(friendly(error));
    }
    // Someone who already had an account and used "Create account": keep their details, fill any gaps.
    const m = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    if (creating && (!m.full_name || !m.phone)) {
      await supabase.auth.updateUser({ data: { full_name: m.full_name || details.full_name, phone: m.phone || details.phone } });
    }
  }

  return (
    <Card title="Check your email">
      <p className="max-w-xl text-body">
        We sent a code to <strong>{email}</strong>. It works for 1 hour. Can&apos;t see it? Check your spam or promotions folder.
      </p>
      <form onSubmit={verify} className="grid max-w-sm gap-4">
        <label htmlFor="acc-code" className={label}>
          Code
        </label>
        <input
          id="acc-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          aria-invalid={error ? true : undefined}
          className={`-mt-2 h-14 rounded-xl border bg-surface px-4 text-center font-display text-3xl font-extrabold tracking-[0.35em] outline-none ${
            error ? "border-danger" : "border-line"
          }`}
        />
        {(error || sendError) && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error || sendError}
          </p>
        )}
        <button type="submit" disabled={checking} className={primary}>
          {checking ? "Checking…" : creating ? "Create account" : "Sign in"}
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={back} className="flex items-center gap-1 font-semibold text-text2 hover:text-text">
            <Icon name="back" size={16} /> Change email
          </button>
          <button type="button" onClick={resend} disabled={wait > 0 || busy} className="font-semibold text-link disabled:text-text2">
            {busy ? "Sending…" : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function SignedIn({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const profile = profileOf(user);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const parsed = parsePhone(profile.phone);
  const [country, setCountry] = useState(parsed.country.iso);
  const [phone, setPhone] = useState(profile.phone ? parsed.number : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const initials = (profile.name || profile.email).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  async function save(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Enter your name";
    const p = phoneProblem(countryByIso(country), phone);
    if (p) next.phone = p;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: formatPhone(countryByIso(country), phone) } });
    setBusy(false);
    if (error) return setNotice(friendly(error));
    setNotice("Saved");
    setEditing(false);
  }

  return (
    <Card
      title="Your account"
      aside={
        <span className="flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-bold text-ok-fg">
          <Icon name="check" size={14} strokeWidth={2.6} /> Email confirmed
        </span>
      }
    >
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-volt font-display text-2xl font-extrabold text-night">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xl font-bold">{profile.name || "Runner"}</span>
          <span className="block truncate text-text2">{profile.email}</span>
        </span>
      </div>

      {editing ? (
        <form onSubmit={save} noValidate className="grid max-w-xl gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acc-edit-name" className={label}>
              Full name
            </label>
            <input
              id="acc-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className={`h-12 rounded-xl border bg-surface px-3.5 text-base outline-none ${errors.name ? "border-danger" : "border-line"}`}
            />
            {errors.name && <p className="text-xs font-semibold text-danger">{errors.name}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="acc-edit-phone" className={label}>
              Phone number
            </label>
            <PhoneField id="acc-edit-phone" country={country} number={phone} onCountry={setCountry} onNumber={setPhone} error={errors.phone} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={primary}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={secondary}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid max-w-xl gap-x-6 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-sm font-semibold text-text2">Email</dt>
          <dd className="break-all">{profile.email}</dd>
          <dt className="text-sm font-semibold text-text2">Phone</dt>
          <dd>{profile.phone || "—"}</dd>
        </dl>
      )}

      {notice && !editing && (
        <p role="status" className="text-sm font-semibold text-ok-fg">
          {notice}
        </p>
      )}

      {!editing && (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => (setNotice(null), setEditing(true))} className={secondary}>
            Edit details
          </button>
          <button type="button" onClick={() => supabase.auth.signOut()} className={secondary}>
            Sign out
          </button>
        </div>
      )}
    </Card>
  );
}
