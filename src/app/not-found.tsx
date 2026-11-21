import Link from "next/link";
import { Container } from "@/components/page";

export default function NotFound() {
  return (
    <main>
      <Container className="flex flex-col items-center gap-4 py-24 text-center">
        <span className="outline-numeral text-[180px] leading-none [-webkit-text-stroke-color:var(--icon)]">404</span>
        <h1 className="font-display text-5xl font-extrabold uppercase">Wrong turn</h1>
        <p className="max-w-md text-text2">We couldn&apos;t find that page. The race may have been removed or renamed.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/events" className="flex h-12 items-center rounded-xl bg-primary px-6 font-bold text-on-primary">
            Browse races
          </Link>
          <Link href="/" className="flex h-12 items-center rounded-xl border-[1.5px] border-outline px-6 font-semibold">
            Home
          </Link>
        </div>
      </Container>
    </main>
  );
}
