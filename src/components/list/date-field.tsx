"use client";

import { useEffect, useRef, useState } from "react";
import { MONTHS, daysInMonth, dmy, isoDate, pad, splitIso, weekday } from "@/lib/dates";
import { Icon } from "../icon";

const ROW = 44;
const VISIBLE = 5;

type Option = { label: string; disabled?: boolean };

/** One spinning column (CSS scroll-snap), like the iPhone date wheel. Arrow keys work too. */
function Wheel({ options, index, onChange, label }: { options: Option[]; index: number; onChange: (i: number) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState(index);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTo({ top: index * ROW });
  }, [index, options.length]);

  return (
    <div
      ref={ref}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={index}
      aria-valuetext={options[index]?.label}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const n = index + (e.key === "ArrowDown" ? 1 : -1);
          if (n >= 0 && n < options.length) onChange(n);
        }
      }}
      onScroll={(e) => {
        const top = e.currentTarget.scrollTop;
        setLive(Math.round(top / ROW));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const i = Math.max(0, Math.min(options.length - 1, Math.round(top / ROW)));
          if (i !== index) onChange(i);
        }, 120);
      }}
      className="no-scrollbar relative z-10 min-w-0 flex-1 snap-y snap-mandatory overflow-y-scroll rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      style={{ height: ROW * VISIBLE, paddingBlock: ROW * ((VISIBLE - 1) / 2) }}
    >
      {options.map((o, i) => {
        const d = Math.abs(i - live);
        return (
          <button
            type="button"
            tabIndex={-1}
            key={`${o.label}-${i}`}
            onClick={() => onChange(i)}
            className={`flex w-full snap-center items-center justify-center text-xl ${d === 0 ? "font-bold" : ""} ${o.disabled ? "text-text2 line-through" : "text-text"}`}
            style={{ height: ROW, opacity: o.disabled ? 0.35 : d === 0 ? 1 : d === 1 ? 0.55 : 0.28 }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A date box that opens day / month / year wheels. Value is ISO (2026-12-19); it shows as 19/Dec/2026.
 * `min` greys out earlier days and blocks choosing them.
 */
export function DateField({
  id,
  value,
  onChange,
  label,
  min,
  max,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  label: string;
  min: string;
  max?: string;
  invalid?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The wheels mount once the dialog is showing, so they can scroll to the current value.
  const [isOpen, setOpen] = useState(false);
  // `min` is empty only for a moment while the page first loads.
  const minP = splitIso(min) ?? { y: 2026, m: 1, d: 1 };
  const [y, setY] = useState(minP.y);
  const [m, setM] = useState(minP.m);
  const [d, setD] = useState(minP.d);

  const open = () => {
    const p = splitIso(value) ?? minP;
    setY(p.y);
    setM(p.m);
    setD(p.d);
    dialog.current?.showModal();
    setOpen(true);
  };

  const years = Array.from({ length: 4 }, (_, i) => minP.y + i);
  const days = daysInMonth(y, m);
  const day = Math.min(d, days);
  const picked = isoDate(y, m, day);
  const note =
    picked < min ? "That date has passed. Pick today or later." : max && picked > max ? `Pick a date on or before ${dmy(max)}.` : null;

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={open}
        data-invalid={invalid || undefined}
        aria-haspopup="dialog"
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-base data-[invalid=true]:border-danger"
      >
        <span className={value ? "" : "text-text2"}>{value ? dmy(value) : "dd/mon/yyyy"}</span>
        <Icon name="calendar" size={20} className="text-icon" />
      </button>
      {value && <span className="sr-only">{weekday(value)}</span>}

      <dialog
        ref={dialog}
        aria-label={label}
        onClose={() => setOpen(false)}
        className="inset-x-0 m-0 mt-auto box-border w-full max-w-[100vw] overflow-hidden rounded-t-[22px] bg-surface p-5 text-text backdrop:bg-black/45 sm:m-auto sm:max-w-md sm:rounded-[22px]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{label}</h2>
          <button type="button" className="text-sm font-semibold text-link" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
        </div>
        <div className="relative mt-3 flex gap-2" style={{ height: ROW * VISIBLE }}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 rounded-xl bg-tile" style={{ top: ROW * 2, height: ROW }} />
          {isOpen && (
            <>
              <Wheel
                label="Day"
                index={day - 1}
                onChange={(i) => setD(i + 1)}
                options={Array.from({ length: days }, (_, i) => ({ label: pad(i + 1), disabled: isoDate(y, m, i + 1) < min }))}
              />
              <Wheel
                label="Month"
                index={m - 1}
                onChange={(i) => setM(i + 1)}
                options={MONTHS.map((name, i) => ({ label: name, disabled: isoDate(y, i + 1, daysInMonth(y, i + 1)) < min }))}
              />
              <Wheel
                label="Year"
                index={Math.max(0, years.indexOf(y))}
                onChange={(i) => setY(years[i])}
                options={years.map((v) => ({ label: String(v) }))}
              />
            </>
          )}
        </div>
        <p className={`mt-2 min-h-5 text-center text-sm font-semibold ${note ? "text-danger" : "text-text2"}`} role="status">
          {note ?? `${weekday(picked)} ${dmy(picked)}`}
        </p>
        <button
          type="button"
          disabled={!!note}
          onClick={() => {
            onChange(picked);
            dialog.current?.close();
          }}
          className="mt-3 h-12 w-full rounded-xl bg-primary font-bold text-on-primary disabled:opacity-50"
        >
          Done
        </button>
      </dialog>
    </>
  );
}

const fmt12 = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** Hour and minute wheels (5-minute steps). Value "HH:MM", shown as "6:30 AM". */
export function TimeField({ id, value, onChange, label }: { id: string; value: string; onChange: (v: string) => void; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [h, setH] = useState(6);
  const [mi, setMi] = useState(0);
  const p = /^(\d{2}):(\d{2})$/.exec(value);
  const text = p ? `${Number(p[1]) % 12 === 0 ? 12 : Number(p[1]) % 12}:${p[2]} ${Number(p[1]) < 12 ? "AM" : "PM"}` : null;

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        onClick={() => {
          setH(p ? Number(p[1]) : 6);
          setMi(p ? Math.round(Number(p[2]) / 5) * 5 : 0);
          dialog.current?.showModal();
          setOpen(true);
        }}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-base"
      >
        <span className={text ? "" : "text-text2"}>{text ?? "Optional"}</span>
        <Icon name="clock" size={20} className="text-icon" />
      </button>
      <dialog
        ref={dialog}
        aria-label={label}
        onClose={() => setOpen(false)}
        className="inset-x-0 m-0 mt-auto box-border w-full max-w-[100vw] overflow-hidden rounded-t-[22px] bg-surface p-5 text-text backdrop:bg-black/45 sm:m-auto sm:max-w-sm sm:rounded-[22px]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{label}</h2>
          <button type="button" className="text-sm font-semibold text-link" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
        </div>
        <div className="relative mt-3 flex gap-2 px-8" style={{ height: ROW * VISIBLE }}>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 rounded-xl bg-tile" style={{ top: ROW * 2, height: ROW }} />
          {isOpen && (
            <>
              <Wheel label="Hour" index={h} onChange={setH} options={Array.from({ length: 24 }, (_, i) => ({ label: fmt12(i) }))} />
              <Wheel
                label="Minutes"
                index={Math.max(0, MINUTES.indexOf(mi))}
                onChange={(i) => setMi(MINUTES[i])}
                options={MINUTES.map((v) => ({ label: pad(v) }))}
              />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(`${pad(h)}:${pad(mi)}`);
            dialog.current?.close();
          }}
          className="mt-4 h-12 w-full rounded-xl bg-primary font-bold text-on-primary"
        >
          Done
        </button>
      </dialog>
    </>
  );
}
