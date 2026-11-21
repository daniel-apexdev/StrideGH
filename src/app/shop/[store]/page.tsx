import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Breadcrumbs, Container } from "@/components/page";
import { Catalogue, CatalogueLive } from "@/components/shop/catalogue";
import { StoreBadges, StoreLogo } from "@/components/shop/shop-bits";
import { instagramLink, mapsLink, telLink, whatsappLink } from "@/lib/stores/format";
import { getStore, getStores } from "@/lib/stores/repository";

export async function generateStaticParams() {
  return (await getStores()).map((s) => ({ store: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[store]">): Promise<Metadata> {
  const store = await getStore((await params).store);
  return store ? { title: store.name, description: store.description } : { title: "Shop not found" };
}

function Row({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line2 px-4 py-3.5 text-sm first:border-t-0">
      <Icon name={icon} size={18} className="shrink-0 text-icon" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">{children}</div>
    </div>
  );
}

export default async function StorePage({ params }: PageProps<"/shop/[store]">) {
  const store = await getStore((await params).store);
  if (!store) notFound();
  const products = store.products.map((p) => ({ ...p, store }));
  const chat = store.whatsapp ?? null;

  return (
    <main>
      <section className="relative overflow-hidden bg-hero text-on-hero">
        {store.cover ? (
          <>
            <Image src={store.cover.src} alt={store.cover.alt} fill priority sizes="100vw" className="object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10" />
          </>
        ) : (
          <span aria-hidden className="outline-numeral pointer-events-none absolute -right-6 -top-10 text-[300px] leading-none opacity-30">
            {store.area.split(" ")[0].toUpperCase().slice(0, 6)}
          </span>
        )}
        <Container className="relative flex flex-col gap-6 pb-10 pt-8 md:pt-12">
          <Breadcrumbs tone="hero" items={[{ href: "/", label: "Home" }, { href: "/shop", label: "Shop" }, { label: store.name }]} />
          <div className="flex flex-col gap-5 md:flex-row md:items-end">
            <StoreLogo store={store} size={112} className="border-4 border-white/20" />
            <div className="flex flex-col gap-3">
              <StoreBadges store={store} />
              <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] md:text-7xl">{store.name}</h1>
              <p className="flex items-center gap-2 text-on-hero2">
                <Icon name="pin" size={16} />
                {store.area}, {store.city}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 pt-10 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <p className="text-[16px] leading-relaxed text-body">{store.description}</p>
          {store.demo && <p className="text-sm text-text2">A made-up shop to show how shop pages will look. It can&apos;t be contacted.</p>}
          {!store.demo && store.verification === "pending" && (
            <p className="text-sm text-text2">We&apos;re still checking this shop&apos;s details. Agree price and collection with the shop before paying.</p>
          )}

          {(chat || store.phone) && (
            <div className="grid gap-2.5">
              {chat && (
                <a
                  href={whatsappLink(chat, `Hi ${store.name}! I found you on Stride GH.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-on-primary"
                >
                  <Icon name="message" size={18} />
                  Message on WhatsApp
                </a>
              )}
              {store.phone && (
                <a href={telLink(store.phone)} className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-outline font-semibold">
                  <Icon name="phone" size={18} />
                  Call {store.phone}
                </a>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface">
            <Row icon="pin">
              <span>{[store.address, store.address?.includes(store.area) ? null : store.area, store.city].filter(Boolean).join(", ")}</span>
              <a href={mapsLink(store)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-[13px] font-bold text-link hover:underline">
                Directions
              </a>
            </Row>
            {store.hours && (
              <Row icon="clock">
                <span>{store.hours}</span>
              </Row>
            )}
            <Row icon="truck">
              <span>{[store.collection && "Collect in store", store.delivery && `Delivery: ${store.delivery}`].filter(Boolean).join(" · ") || "Ask the shop"}</span>
            </Row>
            {store.payments.length > 0 && (
              <Row icon="wallet">
                <span>{store.payments.join(" · ")}</span>
              </Row>
            )}
            {store.instagram && (
              <Row icon="instagram">
                <a href={instagramLink(store.instagram)} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
                  {store.instagram}
                </a>
              </Row>
            )}
          </div>

          <Link href="/events" className="flex items-center gap-3 rounded-2xl bg-tile p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-hero text-volt">
              <Icon name="flag" size={20} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[11px] font-bold tracking-[0.08em] text-clay">RACING SOON?</span>
              <span className="text-sm font-bold">See upcoming races in Ghana</span>
            </span>
            <Icon name="arrow" size={18} />
          </Link>
        </aside>

        <Suspense fallback={<Catalogue products={products} basePath={`/shop/${store.slug}`} layout="chips" cat={null} />}>
          <CatalogueLive products={products} basePath={`/shop/${store.slug}`} layout="chips" />
        </Suspense>
      </Container>
    </main>
  );
}
