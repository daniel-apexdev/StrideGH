"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../icon";

type Props = {
  fee: string;
  past: boolean;
  method: "url" | "phone" | "ussd" | "none";
  url: string | null;
  host: string | null;
  note: string | null;
};

/**
 * Sticky registration bar. Registration always happens on the organiser's own page —
 * we show an interstitial so runners know they're leaving and that we don't take payment.
 */
export function RegisterBar(props: Props) {
  return <Register {...props} layout="bar" />;
}

/** The same registration action as a block, for the race page's side panel on wide screens. */
export function RegisterPanel(props: Props) {
  return <Register {...props} layout="panel" />;
}

function Register({ fee, past, method, url, host, note, layout }: Props & { layout: "bar" | "panel" }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const hasLink = method === "url" && !!url;

  const action = past ? (
            <button disabled className="h-[52px] flex-1 rounded-xl bg-neu-bg text-[15px] font-bold text-text2">
              This race has taken place
            </button>
          ) : hasLink ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-volt text-[15px] font-bold text-night"
            >
              Official registration
              <Icon name="external" size={18} strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-[52px] flex-1 rounded-xl border-[1.5px] border-outline text-[15px] font-bold"
            >
              How to register
            </button>
          );

  return (
    <>
      {layout === "bar" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 px-5 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-[11px] font-semibold text-text2">ENTRY</span>
              <span className="truncate font-display text-[22px] font-extrabold leading-none">{fee}</span>
            </div>
            {action}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-bold tracking-[0.1em] text-text2">ENTRY</span>
            <span className="font-display text-3xl font-extrabold leading-none">{fee}</span>
          </div>
          <div className="flex">{action}</div>
          {!past && hasLink && host && <p className="text-xs text-text2">You&apos;ll register and pay on {host}. Stride GH doesn&apos;t take entry fees.</p>}
        </div>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && setOpen(false)}
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-scrim sm:m-auto sm:max-w-lg"
        aria-label="Registration"
      >
        <div className="mx-auto flex max-w-xl flex-col gap-3.5 rounded-t-[20px] bg-surface px-5 pb-6 pt-2.5 text-text sm:rounded-[20px] sm:px-7 sm:pt-7">
          <span className="h-1 w-10 self-center rounded bg-line sm:hidden" />
          {hasLink ? (
            <>
              <h2 className="font-display text-[28px] font-extrabold uppercase leading-none">
                You&apos;re heading to the official site
              </h2>
              <p className="text-sm leading-relaxed text-body">
                Registration and payment for this race happen on the organiser&apos;s page. Stride GH doesn&apos;t take
                payment for race entries.
              </p>
              <div className="flex items-center gap-2 rounded-[10px] bg-soft p-3 text-[13px]">
                <Icon name="lock" size={16} className="text-icon" />
                <span>
                  <strong>{host}</strong>
                  {note ? ` · ${note}` : ""}
                </span>
              </div>
              <a
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[52px] items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-on-primary"
              >
                Continue to {host}
              </a>
            </>
          ) : (
            <>
              <h2 className="font-display text-[28px] font-extrabold uppercase leading-none">How to register</h2>
              <p className="text-sm leading-relaxed text-body">{note ?? "Registration details have not been published yet."}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center justify-center rounded-xl border-[1.5px] border-outline text-[15px] font-semibold"
                >
                  Read more on {host}
                </a>
              )}
            </>
          )}
          <button type="button" onClick={() => setOpen(false)} className="h-12 text-[15px] font-semibold">
            Stay on Stride GH
          </button>
        </div>
      </dialog>
    </>
  );
}
