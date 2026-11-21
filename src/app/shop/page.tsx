import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { Container, PageHero } from "@/components/page";
import { Catalogue, CatalogueLive } from "@/components/shop/catalogue";
import { StoreBadges, StoreLogo } from "@/components/shop/shop-bits";
import { getAllProducts, getStores } from "@/lib/stores/repository";

export const metadata: Metadata = { title: "Running gear", description: "Running shoes, kit and hydration from local shops in Ghana." };

export default async function ShopPage() {
  const [stores, all] = await Promise.all([getStores(), getAllProducts()]);
  const onlySamples = stores.length > 0 && stores.every((s) => s.demo);

  return (
    <main>
      <PageHero kicker="FROM LOCAL SHOPS" title="Running gear" crumbs={[{ href: "/", label: "Home" }, { label: "Shop" }]}>
        <p className="max-w-2xl text-lg text-on-hero2">
          Shoes, kit and hydration from running shops in Ghana. Ask the shop on WhatsApp, then collect in store or get it delivered.
        </p>
      </PageHero>

      {onlySamples && (
        <Container className="pt-8">
          <p className="flex gap-3 rounded-2xl bg-warn-bg p-4 text-sm text-warn-fg">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            These are sample shops to show how the shop will work. Real local running shops are being added.
          </p>
        </Container>
      )}

      <Container as="section" className="pt-10">
        <h2 className="mb-5 font-display text-3xl font-extrabold uppercase">Local shops</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((s) => (
            <li key={s.slug}>
              <Link href={`/shop/${s.slug}`} className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 hover:shadow-lg">
                <StoreLogo store={s} size={64} />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="font-display text-2xl font-bold leading-none group-hover:underline">{s.name}</span>
                  <span className="flex items-center gap-1 text-sm text-text2">
                    <Icon name="pin" size={14} />
                    {s.area}, {s.city}
                  </span>
                  <span className="line-clamp-2 text-sm text-body">{s.description}</span>
                  <span className="flex flex-wrap items-center gap-2 pt-1">
                    <StoreBadges store={s} />
                    <span className="text-xs text-text2">{s.products.length} products</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="pt-14">
        <Suspense fallback={<Catalogue products={all} basePath="/shop" layout="sidebar" showStore cat={null} />}>
          <CatalogueLive products={all} basePath="/shop" layout="sidebar" showStore />
        </Suspense>
      </Container>

      <Container className="pt-14">
        <div className="flex flex-col items-start gap-3 rounded-3xl bg-tile p-8 md:flex-row md:items-center md:justify-between">
          <span>
            <span className="block font-display text-3xl font-extrabold uppercase">Run a running shop?</span>
            <span className="text-body">Shop sign-ups open soon. For now, contact the Stride GH team to be listed.</span>
          </span>
          <Icon name="store" size={40} className="text-icon" />
        </div>
      </Container>
    </main>
  );
}
