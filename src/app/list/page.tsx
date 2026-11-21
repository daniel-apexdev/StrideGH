import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ListForm } from "@/components/list/list-form";
import { Container, PageHero } from "@/components/page";
import { listingGuide } from "@/lib/submissions/form";

export const metadata: Metadata = {
  title: "List your race",
  description: "Organising a run in Ghana? List it on Stride GH for free. Every race is checked before it goes live.",
};

export default function ListPage() {
  return (
    <main>
      <PageHero kicker="FOR ORGANISERS · FREE" title="List your race on Stride GH" crumbs={[{ href: "/", label: "Home" }, { label: "List your race" }]}>
        <p className="max-w-2xl text-lg text-on-hero2">
          Reach runners across Ghana. Tell us about your race and we&apos;ll check it against your official page before it goes live.
        </p>
        <div className="mt-2 flex flex-wrap gap-6">
          {listingGuide.steps.map((st, i) => (
            <div key={st.title} className="flex max-w-[260px] items-start gap-3">
              <span className="font-display text-4xl font-extrabold leading-none text-volt">{i + 1}</span>
              <span>
                <span className="block font-bold">{st.title}</span>
                <span className="text-sm text-on-hero2">{st.body}</span>
              </span>
            </div>
          ))}
        </div>
      </PageHero>

      <Container className="grid gap-10 pt-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Race details form" className="min-w-0">
          <ListForm />
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-2xl bg-tile p-5">
            <h2 className="mb-3 text-xs font-bold tracking-[0.1em] text-text2">HAVE THESE READY</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-body">
              {listingGuide.needs.map((n) => (
                <li key={n} className="flex gap-2">
                  <Icon name="check" size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-icon" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-3 text-xs font-bold tracking-[0.1em] text-text2">LISTING GUIDELINES</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-body">
              {listingGuide.rules.map((n) => (
                <li key={n} className="flex gap-2">
                  <Icon name="info" size={16} className="mt-0.5 shrink-0 text-icon" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
          <Link href="/list/status" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 font-bold hover:shadow-md">
            <Icon name="clock" size={20} className="text-icon" />
            <span className="flex-1">Already sent a race? Check its status</span>
            <Icon name="arrow" size={18} />
          </Link>
        </aside>
      </Container>
    </main>
  );
}
