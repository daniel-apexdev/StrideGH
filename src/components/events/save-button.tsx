"use client";

import Link from "next/link";
import { useState } from "react";
import { useSavedEvents } from "@/lib/saved";
import { Icon } from "../icon";

export function SaveButton({ slug, wide }: { slug: string; wide?: boolean }) {
  const { isSaved, toggle } = useSavedEvents();
  const [toast, setToast] = useState(false);
  const saved = isSaved(slug);

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => setToast(toggle(slug))}
        className={
          wide
            ? `flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] text-sm font-semibold ${
                saved ? "border-volt bg-volt text-night" : "border-outline"
              }`
            : `flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold text-night ${saved ? "bg-volt" : "bg-white"}`
        }
      >
        <Icon name="bookmark" size={18} fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
      {toast && (
        <div
          role="status"
          className="fixed inset-x-5 bottom-24 z-40 lg:bottom-8 mx-auto flex max-w-[520px] items-center justify-between rounded-xl border border-line bg-ink px-3.5 py-3 text-sm text-on-ink"
        >
          Saved to your races
          <Link href="/saved" className="font-bold text-volt">
            View Saved
          </Link>
        </div>
      )}
    </>
  );
}
