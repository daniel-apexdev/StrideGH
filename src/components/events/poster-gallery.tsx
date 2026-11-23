"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Poster } from "@/lib/events/types";
import { Icon } from "../icon";

/**
 * The race poster on its own at the top of the race page. Tap it to view it full screen
 * (with the other images after it, if there are any).
 */
export function PosterFrame({
  poster,
  images,
  raceName,
  muted = false,
}: {
  poster: Poster;
  /** Everything the full-screen viewer can step through: the poster first, then the photos. */
  images: Poster[];
  raceName: string;
  /** Past race: greyed out (the full-screen view stays in colour). */
  muted?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="w-full max-w-[460px]">
      <button
        type="button"
        onClick={() => setOpen(0)}
        aria-label={`${poster.alt}. Opens full screen.`}
        className="group relative block aspect-[4/5] w-full overflow-hidden rounded-2xl bg-black/25 shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
      >
        <Image
          src={poster.src}
          alt={poster.alt}
          fill
          priority
          sizes="(max-width: 1024px) 90vw, 460px"
          className={`object-contain ${muted ? "brightness-75 grayscale" : ""}`}
        />
      </button>
      <Lightbox images={images} start={open} onClose={() => setOpen(null)} label={`${raceName} images`} />
    </div>
  );
}

/**
 * The organiser's other images (medal, route, second flyer…) in a swipeable row under the
 * race details. Arrows on larger screens; tap an image to view it full screen.
 */
export function PhotoCarousel({ photos, images, raceName }: { photos: Poster[]; images: Poster[]; raceName: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const offset = images.length - photos.length; // the poster comes first in `images`

  function onScroll() {
    const t = track.current;
    if (!t) return;
    setEdge({ start: t.scrollLeft < 8, end: t.scrollLeft + t.clientWidth >= t.scrollWidth - 8 });
  }
  useEffect(onScroll, []);

  const step = (dir: 1 | -1) => {
    const t = track.current;
    if (t) t.scrollBy({ left: dir * Math.max(240, t.clientWidth * 0.8), behavior: "smooth" });
  };
  const arrow =
    "hidden h-11 w-11 items-center justify-center rounded-full border border-line bg-surface shadow-sm transition hover:bg-tile disabled:opacity-40 md:flex";

  return (
    <div className="relative">
      {photos.length > 1 && !(edge.start && edge.end) && (
        <div className="absolute -top-[68px] right-0 flex gap-2">
          <button type="button" onClick={() => step(-1)} disabled={edge.start} aria-label="Previous photos" className={arrow}>
            <Icon name="back" size={20} />
          </button>
          <button type="button" onClick={() => step(1)} disabled={edge.end} aria-label="More photos" className={arrow}>
            <Icon name="arrow" size={20} />
          </button>
        </div>
      )}
      <ul
        ref={track}
        onScroll={onScroll}
        aria-label={`Photos and flyers from ${raceName}`}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {photos.map((img, i) => (
          <li key={img.src} className="w-[72%] shrink-0 snap-start sm:w-[300px]">
            <button
              type="button"
              onClick={() => setOpen(offset + i)}
              aria-label={`View full size: ${img.alt}`}
              className="group block w-full text-left"
            >
              <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-tile">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 640px) 72vw, 300px"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-2 line-clamp-2 block text-sm text-text2">{img.alt}</span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox images={images} start={open} onClose={() => setOpen(null)} label={`${raceName} images`} />
    </div>
  );
}

/** Full-screen viewer with arrows, swipe and keyboard. `start` null = closed. */
function Lightbox({ images, start, onClose, label }: { images: Poster[]; start: number | null; onClose: () => void; label: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [opened, setOpened] = useState<number | null>(null);
  // Jump to the tapped image each time the viewer opens.
  if (start !== opened) {
    setOpened(start);
    if (start !== null) setIndex(start);
  }
  const count = images.length;
  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (start !== null && !d.open) d.showModal();
    if (start === null && d.open) d.close();
  }, [start]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      aria-label={label}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
    >
      {start !== null && <Viewer images={images} index={index} go={go} close={onClose} />}
    </dialog>
  );
}

function Viewer({ images, index, go, close }: { images: Poster[]; index: number; go: (step: number) => void; close: () => void }) {
  const startX = useRef<number | null>(null);
  const img = images[index];
  const many = images.length > 1;
  const arrow = "absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex";
  return (
    <div
      className="relative flex h-full w-full flex-col"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null || !many) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
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
