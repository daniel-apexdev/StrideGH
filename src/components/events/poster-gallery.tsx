"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Poster } from "@/lib/events/types";
import { Icon } from "../icon";

/**
 * The organiser's poster, big, with the rest of their images (medal, route, second flyer)
 * as thumbnails underneath. Tap a thumbnail to show it in the main frame; tap the main
 * image to view everything full screen, with arrows, swipe and keyboard to move between them.
 */
export function PosterGallery({ images, raceName }: { images: Poster[]; raceName: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = images.length;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);
  const current = images[index];

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View full size: ${current.alt}`}
        className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black/25 shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 90vw, 460px"
          className="object-contain"
        />
        <span className="absolute bottom-3 right-3 flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3 text-xs font-semibold text-white opacity-90 backdrop-blur transition group-hover:opacity-100">
          <Icon name="external" size={14} /> {count > 1 ? `${index + 1} / ${count} · View` : "View full size"}
        </span>
      </button>

      {count > 1 && (
        <ul aria-label={`Images from ${raceName}`} className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1}: ${img.alt}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-black/25 transition ${
                  i === index ? "ring-[3px] ring-volt" : "opacity-70 ring-1 ring-white/25 hover:opacity-100"
                }`}
              >
                <Image src={img.src} alt="" fill sizes="88px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        aria-label={`${raceName} images`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
      >
        {open && <Viewer images={images} index={index} go={go} close={() => setOpen(false)} />}
      </dialog>
    </div>
  );
}

function Viewer({ images, index, go, close }: { images: Poster[]; index: number; go: (step: number) => void; close: () => void }) {
  const start = useRef<number | null>(null);
  const img = images[index];
  const many = images.length > 1;
  const arrow = "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex";
  return (
    <div
      className="relative flex h-full w-full flex-col"
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current === null || !many) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-semibold text-white/80">{many ? `${index + 1} of ${images.length}` : ""}</span>
        <button type="button" onClick={close} aria-label="Close" autoFocus className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <Icon name="x" size={22} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <Image key={img.src} src={img.src} alt={img.alt} fill sizes="100vw" className="select-none object-contain px-2 sm:px-20" draggable={false} />
        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className={`${arrow} left-4`}>
              <Icon name="back" size={22} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className={`${arrow} right-4`}>
              <Icon name="arrow" size={22} />
            </button>
          </>
        )}
      </div>
      <p className="mx-auto max-w-2xl px-5 py-4 text-center text-sm text-white/75">{img.alt}</p>
      {many && (
        <div className="flex justify-center gap-2 pb-5">
          {images.map((m, i) => (
            <span key={m.src} aria-hidden className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-volt" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
