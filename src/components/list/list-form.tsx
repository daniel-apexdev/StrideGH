"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { distanceCategories } from "@/lib/events/types";
import {
  draftToInput,
  emptyDistance,
  emptyDraft,
  ghanaRegions,
  guessCategory,
  inputToDraft,
  type DistanceDraft,
  type FormDraft,
} from "@/lib/submissions/form";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  fieldErrors,
  includedLabels,
  includedOptions,
  organiserRoleLabels,
  organiserRoles,
  raceTypeLabels,
  raceTypes,
  submissionInputSchema,
  type SubmissionInput,
} from "@/lib/submissions/schema";
import { contactEmail, isStaticSite } from "@/lib/site";
import { submissionEmail } from "@/lib/submissions/email-summary";
import { Icon } from "../icon";
import { EmailField, PhoneField } from "./contact-fields";
import { DateField, TimeField } from "./date-field";

const noop = () => () => {};
const DRAFT_KEY = "stride:list-draft";
export const MINE_KEY = "stride:my-submissions";
export const RESUBMIT_KEY = "stride:list-resubmit";

type Mine = { reference: string; email: string; name: string };
export function rememberSubmission(m: Mine) {
  try {
    const all: Mine[] = JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]");
    localStorage.setItem(MINE_KEY, JSON.stringify([m, ...all.filter((x) => x.reference !== m.reference)].slice(0, 20)));
  } catch {}
}

const input = "h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base aria-[invalid=true]:border-danger";

function Field({ label, hint, error, children, id }: { label: string; hint?: string; error?: string; children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {hint && <p className="-mt-1 text-xs text-text2">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-[16px] border border-line bg-surface p-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-on-primary">{n}</span>
        <span className="font-display text-2xl font-extrabold uppercase leading-none">{title}</span>
      </div>
      {children}
    </fieldset>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${on ? "border-sel bg-sel text-on-sel" : "border-line bg-bg"}`}
    >
      {children}
    </button>
  );
}

/** Counts up to the minimum, then just shows the length. */
function DescriptionCount({ length }: { length: number }) {
  const left = DESCRIPTION_MIN - length;
  return (
    <p id="description-count" className={`mt-1 flex items-center justify-end gap-1 text-xs ${left <= 0 ? "font-semibold text-ok-fg" : "text-text2"}`}>
      {left <= 0 && <Icon name="check" size={14} strokeWidth={2.6} />}
      {left > 0 ? `${length}/${DESCRIPTION_MIN} — ${left} more to go` : `${length.toLocaleString("en-GB")} characters`}
    </p>
  );
}

export function ListForm() {
  const [draft, setDraft] = useState<FormDraft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; email: string } | null>(null);
  /** Static site only: the listing written out as an email for the organiser to send. */
  const [emailOut, setEmailOut] = useState<{ subject: string; body: string } | null>(null);
  const [resubmit, setResubmit] = useState<{ reference: string } | null>(null);
  const loaded = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);

  // Restore a draft, or an earlier submission being edited after changes were requested.
  useEffect(() => {
    try {
      const r = sessionStorage.getItem(RESUBMIT_KEY);
      if (r) {
        const { reference, data } = JSON.parse(r) as { reference: string; data: SubmissionInput };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off restore from browser storage
        setDraft(inputToDraft(data));
        setResubmit({ reference });
      } else {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) setDraft({ ...emptyDraft(), ...JSON.parse(saved) });
      }
    } catch {}
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || resubmit || done) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft, resubmit, done]);

  // After a first try, re-check as they type so fixed fields lose their red straight away.
  const update = (next: FormDraft) => {
    setDraft(next);
    if (Object.keys(errors).length) {
      const r = submissionInputSchema.safeParse(draftToInput(next));
      setErrors(r.success ? {} : fieldErrors(r.error));
    }
  };
  const set = <K extends keyof FormDraft>(k: K, v: FormDraft[K]) => update({ ...draft, [k]: v });
  const setDistance = (i: number, patch: Partial<DistanceDraft>) =>
    update({ ...draft, distances: draft.distances.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  // Read the clock in the browser only (not while the page is prerendered).
  const today = useSyncExternalStore(
    noop,
    () => new Date().toISOString().slice(0, 10),
    () => "",
  );
  const err = (k: string) => errors[k];
  const inv = (k: string) => (errors[k] ? true : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const body = draftToInput(draft);
    const parsed = submissionInputSchema.safeParse(body);
    if (!parsed.success) {
      const f = fieldErrors(parsed.error);
      setErrors(f);
      const first = Object.keys(f)[0];
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    if (isStaticSite) {
      // No server on GitHub Pages: hand the organiser a ready-written email instead.
      setEmailOut(submissionEmail(parsed.data));
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(resubmit ? `/api/submissions/${resubmit.reference}` : "/api/submissions", {
        method: resubmit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(body as object), source: "web", website: honeypot.current?.value ?? "" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.fields) setErrors(json.fields);
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      const reference = json.submission.reference as string;
      rememberSubmission({ reference, email: draft.email.trim().toLowerCase(), name: draft.name });
      try {
        localStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(RESUBMIT_KEY);
      } catch {}
      setDone({ reference, email: draft.email.trim().toLowerCase() });
      window.scrollTo({ top: 0 });
    } catch {
      setServerError("Couldn't reach Stride GH. Check your connection and try again — your answers are saved on this device.");
    } finally {
      setBusy(false);
    }
  }

  if (emailOut) {
    return <SendByEmail mail={emailOut} onBack={() => setEmailOut(null)} />;
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[16px] bg-hero p-5 text-on-hero">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-volt text-night">
          <Icon name="check" size={26} strokeWidth={2.6} />
        </span>
        <h2 className="font-display text-3xl font-extrabold uppercase leading-none">{resubmit ? "Changes sent" : "Race submitted"}</h2>
        <p className="text-sm leading-relaxed text-on-hero2">
          We&apos;ll check the details and usually reply within 2 working days. Keep your reference to check progress.
        </p>
        <p className="rounded-xl bg-volt px-4 py-2 font-display text-3xl font-extrabold tracking-wider text-night">{done.reference}</p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Link
            href={`/list/status?ref=${done.reference}&email=${encodeURIComponent(done.email)}`}
            className="flex h-11 items-center rounded-xl bg-[#f4f2ec] px-4 text-sm font-bold text-night"
          >
            Check status
          </Link>
          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft());
              setDone(null);
              setResubmit(null);
            }}
            className="flex h-11 items-center rounded-xl border border-hero-line px-4 text-sm font-bold"
          >
            List another race
          </button>
        </div>
      </div>
    );
  }

  const d = draft;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {resubmit && (
        <p className="rounded-xl bg-warn-bg p-3.5 text-sm text-warn-fg">
          <strong>Editing {resubmit.reference}.</strong> Update what the review team asked for, then send it back.
        </p>
      )}
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input ref={honeypot} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      <Step n={1} title="The race">
        <div data-field="race.name">
          <Field id="name" label="Race name" error={err("race.name")}>
            <input id="name" className={input} value={d.name} onChange={(e) => set("name", e.target.value)} aria-invalid={inv("race.name")} maxLength={80} placeholder="e.g. Labadi Beach 10K" />
          </Field>
        </div>
        <div data-field="race.type">
          <Field label="Kind of race" error={err("race.type")}>
            <div className="flex flex-wrap gap-2">
              {raceTypes.map((t) => (
                <Choice key={t} on={d.type === t} onClick={() => set("type", t)}>
                  {raceTypeLabels[t]}
                </Choice>
              ))}
            </div>
          </Field>
        </div>
        <div data-field="race.description">
          <Field
            id="description"
            label="Describe the race"
            hint={`Tip: write at least ${DESCRIPTION_MIN} characters — after that, as much as you like. Cover the route, the atmosphere, who it's for and any cause it supports.`}
            error={err("race.description")}
          >
            <textarea
              id="description"
              rows={6}
              className={`${input} h-auto py-3`}
              value={d.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={inv("race.description")}
              aria-describedby="description-count"
              maxLength={DESCRIPTION_MAX}
            />
          </Field>
          <DescriptionCount length={d.description.trim().length} />
        </div>
      </Step>

      <Step n={2} title="When & where">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div data-field="when.date">
            <Field id="date" label="Race date" error={err("when.date")}>
              <DateField id="date" label="Race date" value={d.date} onChange={(v) => set("date", v)} min={today} invalid={!!err("when.date")} />
            </Field>
          </div>
          <div data-field="when.startTime">
            <Field id="time" label="Start time" error={err("when.startTime")}>
              <TimeField id="time" label="Start time" value={d.startTime} onChange={(v) => set("startTime", v)} />
            </Field>
          </div>
        </div>
        <div data-field="when.venue">
          <Field id="venue" label="Start venue or meeting point" hint="Where runners should go on race morning." error={err("when.venue")}>
            <input id="venue" className={input} value={d.venue} onChange={(e) => set("venue", e.target.value)} aria-invalid={inv("when.venue")} placeholder="e.g. Independence Square" />
          </Field>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div data-field="when.city">
            <Field id="city" label="Town or city" error={err("when.city")}>
              <input id="city" className={input} value={d.city} onChange={(e) => set("city", e.target.value)} aria-invalid={inv("when.city")} placeholder="e.g. Accra" />
            </Field>
          </div>
          <div data-field="when.region">
            <Field id="region" label="Region" error={err("when.region")}>
              <select id="region" className={input} value={d.region} onChange={(e) => set("region", e.target.value)} aria-invalid={inv("when.region")}>
                <option value="">Choose…</option>
                {ghanaRegions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Step>

      <Step n={3} title="Distances & fees">
        {err("distances") && <p className="text-xs font-semibold text-danger">{err("distances")}</p>}
        {d.distances.map((x, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl bg-soft p-3.5" data-field={`distances.${i}.label`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.1em] text-text2">DISTANCE {i + 1}</span>
              {d.distances.length > 1 && (
                <button type="button" className="text-xs font-bold text-danger" onClick={() => set("distances", d.distances.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field id={`dl${i}`} label="Name" error={err(`distances.${i}.label`)}>
                <input id={`dl${i}`} className={input} value={x.label} onChange={(e) => setDistance(i, { label: e.target.value, category: guessCategory(e.target.value) })} placeholder="e.g. 10K" aria-invalid={inv(`distances.${i}.label`)} />
              </Field>
              <Field id={`dc${i}`} label="Category">
                <select id={`dc${i}`} className={input} value={x.category} onChange={(e) => setDistance(i, { category: e.target.value as DistanceDraft["category"] })}>
                  {distanceCategories.map((c) => (
                    <option key={c} value={c}>
                      {c === "Half" ? "Half marathon" : c === "Other" ? "Other distance" : c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div data-field={`distances.${i}.fee`}>
              <Field id={`df${i}`} label="Entry fee (GHS)" hint="Leave blank if it isn't decided yet." error={err(`distances.${i}.fee`)}>
                <div className="flex items-center gap-3">
                  <input id={`df${i}`} inputMode="decimal" className={`${input} flex-1`} value={x.free ? "" : x.fee} disabled={x.free} onChange={(e) => setDistance(i, { fee: e.target.value })} placeholder={x.free ? "Free" : "e.g. 150"} aria-invalid={inv(`distances.${i}.fee`)} />
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={x.free} onChange={(e) => setDistance(i, { free: e.target.checked })} />
                    Free
                  </label>
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <Field id={`dp${i}`} label="Places (optional)" error={err(`distances.${i}.capacity`)}>
                <input id={`dp${i}`} inputMode="numeric" className={input} value={x.capacity} onChange={(e) => setDistance(i, { capacity: e.target.value })} placeholder="e.g. 500" />
              </Field>
              <Field id={`dt${i}`} label="Cut-off (optional)">
                <input id={`dt${i}`} className={input} value={x.cutoff} onChange={(e) => setDistance(i, { cutoff: e.target.value })} placeholder="e.g. 3 hours" maxLength={40} />
              </Field>
            </div>
          </div>
        ))}
        {d.distances.length < 10 && (
          <button type="button" onClick={() => set("distances", [...d.distances, emptyDistance()])} className="h-11 rounded-xl border border-dashed border-dash text-sm font-bold text-link">
            + Add another distance
          </button>
        )}
      </Step>

      <Step n={4} title="What's included">
        <Field label="Runners get" hint="Tick everything that comes with entry.">
          <div className="flex flex-wrap gap-2">
            {includedOptions.map((k) => (
              <Choice key={k} on={d.included.includes(k)} onClick={() => set("included", d.included.includes(k) ? d.included.filter((x) => x !== k) : [...d.included, k])}>
                {includedLabels[k]}
              </Choice>
            ))}
          </div>
        </Field>
        <Field id="other" label="Anything else? (optional)">
          <input id="other" className={input} value={d.includedOther} onChange={(e) => set("includedOther", e.target.value)} placeholder="e.g. Post-race breakfast and music" maxLength={200} />
        </Field>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div data-field="requirements.minAge">
            <Field id="age" label="Minimum age (optional)" error={err("requirements.minAge")}>
              <input id="age" inputMode="numeric" className={input} value={d.minAge} onChange={(e) => set("minAge", e.target.value)} placeholder="e.g. 12" />
            </Field>
          </div>
          <Field label="Walkers welcome?">
            <div className="flex gap-2">
              <Choice on={d.walkersWelcome === "yes"} onClick={() => set("walkersWelcome", d.walkersWelcome === "yes" ? "" : "yes")}>
                Yes
              </Choice>
              <Choice on={d.walkersWelcome === "no"} onClick={() => set("walkersWelcome", d.walkersWelcome === "no" ? "" : "no")}>
                No
              </Choice>
            </div>
          </Field>
        </div>
        <Field id="req" label="Other requirements (optional)" hint="e.g. medical form for the marathon, under-16s need a parent.">
          <input id="req" className={input} value={d.requirementNotes} onChange={(e) => set("requirementNotes", e.target.value)} maxLength={300} />
        </Field>
      </Step>

      <Step n={5} title="Registration">
        <Field label="How do runners register?">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["url", "Online link"],
                ["ussd", "USSD code"],
                ["phone", "Call / WhatsApp"],
                ["not_open", "Not open yet"],
              ] as const
            ).map(([m, label]) => (
              <Choice key={m} on={d.regMethod === m} onClick={() => set("regMethod", m)}>
                {label}
              </Choice>
            ))}
          </div>
        </Field>
        {d.regMethod !== "not_open" && (
          <div data-field="registration.value">
            <Field
              id="regv"
              label={d.regMethod === "url" ? "Registration link" : d.regMethod === "ussd" ? "USSD code" : "Phone or WhatsApp number"}
              hint={d.regMethod === "url" ? "Runners are sent here to sign up and pay." : undefined}
              error={err("registration.value")}
            >
              <input
                id="regv"
                className={input}
                inputMode={d.regMethod === "url" ? "url" : "tel"}
                value={d.regValue}
                onChange={(e) => set("regValue", e.target.value)}
                aria-invalid={inv("registration.value")}
                placeholder={d.regMethod === "url" ? "https://" : d.regMethod === "ussd" ? "e.g. *713*123#" : "e.g. 024 000 0000"}
              />
            </Field>
          </div>
        )}
        <div data-field="registration.deadline">
          <Field id="deadline" label="Registration closes" hint="Your best date for now. If it might move, tick the box and tell us when it changes." error={err("registration.deadline")}>
            <DateField
              id="deadline"
              label="Registration closes"
              value={d.regDeadline}
              onChange={(v) => set("regDeadline", v)}
              min={today}
              max={d.date || undefined}
              invalid={!!err("registration.deadline")}
            />
          </Field>
          <label className="mt-2 flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={d.regDeadlineMayChange} onChange={(e) => set("regDeadlineMayChange", e.target.checked)} />
            This date may change
          </label>
        </div>
        <Field id="poster" label="Official page, poster or social post" hint="A link that shows the race details, so we can check them. Instagram, Facebook, X or your website all work.">
          <input id="poster" inputMode="url" className={input} value={d.posterLink} onChange={(e) => set("posterLink", e.target.value)} placeholder="https://" />
        </Field>
      </Step>

      <Step n={6} title="About you">
        <div data-field="organiser.organisation">
          <Field id="org" label="Organiser" hint="The club, company or group putting on the race." error={err("organiser.organisation")}>
            <input id="org" className={input} value={d.organisation} onChange={(e) => set("organisation", e.target.value)} aria-invalid={inv("organiser.organisation")} />
          </Field>
        </div>
        <div data-field="organiser.contactName">
          <Field id="cname" label="Your name" error={err("organiser.contactName")}>
            <input id="cname" className={input} autoComplete="name" value={d.contactName} onChange={(e) => set("contactName", e.target.value)} aria-invalid={inv("organiser.contactName")} />
          </Field>
        </div>
        <div data-field="organiser.role">
          <Field label="Your connection to the race" error={err("organiser.role")}>
            <div className="flex flex-wrap gap-2">
              {organiserRoles.map((r) => (
                <Choice key={r} on={d.role === r} onClick={() => set("role", r)}>
                  {organiserRoleLabels[r]}
                </Choice>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex flex-col gap-3">
          <div data-field="organiser.email">
            <Field id="email" label="Email" hint="Only the review team sees this. We use it to contact you about the listing.">
              <EmailField id="email" value={d.email} onChange={(v) => set("email", v)} error={err("organiser.email")} />
            </Field>
          </div>
          <div data-field="organiser.phone">
            <Field id="phone" label="Phone or WhatsApp">
              <PhoneField
                id="phone"
                country={d.phoneCountry}
                number={d.phone}
                onCountry={(v) => set("phoneCountry", v)}
                onNumber={(v) => set("phone", v)}
                error={err("organiser.phone")}
              />
            </Field>
          </div>
        </div>
        <Field id="social" label="Instagram, Facebook or website (optional)">
          <input id="social" className={input} value={d.social} onChange={(e) => set("social", e.target.value)} placeholder="@yourclub" />
        </Field>
        <label data-field="consent" className="flex gap-3 rounded-xl bg-soft p-3.5 text-sm leading-snug">
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" checked={d.consent} onChange={(e) => set("consent", e.target.checked)} />
          <span>
            The details are accurate, and I&apos;m allowed to share them. I understand Stride GH reviews every race before it goes live.
            {err("consent") && <span className="mt-1 block text-xs font-semibold text-danger">{err("consent")}</span>}
          </span>
        </label>
      </Step>

      {Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-xl bg-warn-bg p-3.5 text-sm font-semibold text-warn-fg">
          A few details need another look — they&apos;re marked in red above.
        </p>
      )}
      {serverError && (
        <p role="alert" className="rounded-xl bg-warn-bg p-3.5 text-sm font-semibold text-warn-fg">
          {serverError}
        </p>
      )}
      <button disabled={busy} className="h-14 rounded-xl bg-primary font-bold text-on-primary disabled:opacity-60">
        {busy ? "Sending…" : resubmit ? "Send changes for review" : "Submit for review"}
      </button>
      <p className="text-center text-xs text-text2">{resubmit ? "" : "Your answers are saved on this device until you submit."}</p>
    </form>
  );
}

/** Static site: the organiser sends the listing from their own email app. */
function SendByEmail({ mail, onBack }: { mail: { subject: string; body: string }; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const href = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
    : null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${mail.subject}\n\n${mail.body}`);
      setCopied(true);
    } catch {}
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3 rounded-[16px] bg-hero p-5 text-on-hero">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-volt text-night">
          <Icon name="check" size={26} strokeWidth={2.6} />
        </span>
        <h2 className="font-display text-3xl font-extrabold uppercase leading-none">One last step: send it</h2>
        <p className="text-sm leading-relaxed text-on-hero2">
          Your details look good. {href ? "Tap below to open your email app with everything filled in, then press send." : "Copy the details below and email them to the Stride GH team."}{" "}
          We check every race against your official page and usually reply within 2 working days.
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {href && (
            <a href={href} className="flex h-11 items-center gap-2 rounded-xl bg-volt px-4 text-sm font-bold text-night">
              <Icon name="message" size={18} /> Open email to {contactEmail}
            </a>
          )}
          <button type="button" onClick={copy} className="flex h-11 items-center rounded-xl bg-[#f4f2ec] px-4 text-sm font-bold text-night">
            {copied ? "Copied" : "Copy details"}
          </button>
          <button type="button" onClick={onBack} className="flex h-11 items-center rounded-xl border border-hero-line px-4 text-sm font-bold">
            Edit details
          </button>
        </div>
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-surface p-4 text-sm text-body">{mail.body}</pre>
    </div>
  );
}
