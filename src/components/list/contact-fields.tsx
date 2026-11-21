"use client";

import { useState } from "react";
import { countries, countryByIso, emailProblem, emailSuggestion, phoneProblem } from "@/lib/contact";
import { Icon } from "../icon";

const box = "flex h-12 items-center gap-2 rounded-xl border bg-surface px-3.5";

/** Email box that checks the address when you leave it, and suggests fixes for common typos. */
export function EmailField({ id, value, onChange, error }: { id: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [blurred, setBlurred] = useState(false);
  const shown = error ? emailProblem(value) : blurred && value.trim() ? emailProblem(value) : null;
  const suggestion = emailSuggestion(value);
  const ok = !!value.trim() && !emailProblem(value) && !suggestion;
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`${box} ${shown ? "border-danger" : "border-line"}`}>
        <input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setBlurred(true)}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${id}-err` : undefined}
          placeholder="you@example.com"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        {ok && <Icon name="check" size={18} strokeWidth={2.6} className="text-ok-fg" />}
      </div>
      {shown && (
        <p id={`${id}-err`} className="text-xs font-semibold text-danger" role="alert">
          {shown}
        </p>
      )}
      {suggestion && (
        <button type="button" onClick={() => onChange(suggestion)} className="self-start text-left text-sm text-text2">
          Did you mean <strong className="text-link">{suggestion}</strong>?
        </button>
      )}
    </div>
  );
}

/** Country code picker + local number. */
export function PhoneField({
  id,
  country,
  number,
  onCountry,
  onNumber,
  error,
}: {
  id: string;
  country: string;
  number: string;
  onCountry: (iso: string) => void;
  onNumber: (v: string) => void;
  error?: string;
}) {
  const [blurred, setBlurred] = useState(false);
  const cc = countryByIso(country);
  const shown = error ? phoneProblem(cc, number) : blurred && number.trim() ? phoneProblem(cc, number) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <label className={`${box} relative shrink-0 border-line`}>
          <span className="sr-only">Country code</span>
          <span aria-hidden className="text-xl">
            {cc.flag}
          </span>
          <span aria-hidden className="font-semibold">
            +{cc.dial}
          </span>
          <Icon name="back" size={14} className="-rotate-90 text-text2" />
          {/* The native list is easiest to use on phones; it sits invisibly over the button. */}
          <select value={cc.iso} onChange={(e) => onCountry(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Country code">
            {countries.map((x) => (
              <option key={x.iso} value={x.iso}>
                {x.flag} {x.name} (+{x.dial})
              </option>
            ))}
          </select>
        </label>
        <div className={`${box} min-w-0 flex-1 ${shown ? "border-danger" : "border-line"}`}>
          <input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={number}
            maxLength={16}
            onChange={(e) => onNumber(e.target.value.replace(/[^\d\s]/g, ""))}
            onBlur={() => setBlurred(true)}
            aria-invalid={shown ? true : undefined}
            placeholder={cc.iso === "GH" ? "24 123 4567" : "Phone number"}
            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
          />
          {number.trim() && !phoneProblem(cc, number) && <Icon name="check" size={18} strokeWidth={2.6} className="text-ok-fg" />}
        </div>
      </div>
      {shown && (
        <p className="text-xs font-semibold text-danger" role="alert">
          {shown}
        </p>
      )}
    </div>
  );
}
