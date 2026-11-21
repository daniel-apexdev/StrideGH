"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-3 px-5 py-24 text-center">
      <h1 className="font-display text-3xl font-extrabold uppercase">Something went wrong</h1>
      <p className="text-sm text-text2">We couldn&apos;t load this page. Check your connection and try again.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 flex h-12 items-center rounded-xl bg-primary px-5 text-[15px] font-bold text-on-primary"
      >
        Try again
      </button>
    </main>
  );
}
