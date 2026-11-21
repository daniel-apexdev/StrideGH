import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Breadcrumbs, Container, SectionHeading } from "@/components/page";
import { AskShop } from "@/components/shop/ask-shop";
import { Availability, ProductCard, ProductImage, StoreBadges, StoreLogo } from "@/components/shop/shop-bits";
import { formatDate } from "@/lib/events/format";
import { productPrice } from "@/lib/stores/format";
import { getStore, getStores } from "@/lib/stores/repository";

export async function generateStaticParams() {
  return (await getStores()).flatMap((s) => s.products.map((p) => ({ store: s.slug, product: p.slug })));
}

async function load(params: PageProps<"/shop/[store]/[product]">["params"]) {
  const { store: storeSlug, product: productSlug } = await params;
  const store = await getStore(storeSlug);
  const product = store?.products.find((p) => p.slug === productSlug);
  return store && product ? { store, product } : null;
}

export async function generateMetadata({ params }: PageProps<"/shop/[store]/[product]">): Promise<Metadata> {
  const found = await load(params);
  return found ? { title: `${found.product.name} · ${found.store.name}`, description: found.product.description ?? undefined } : { title: "Product not found" };
}

export default async function ProductPage({ params }: PageProps<"/shop/[store]/[product]">) {
  const found = await load(params);
  if (!found) notFound();
  const { store, product } = found;
  const more = store.products.filter((p) => p.slug !== product.slug).slice(0, 4).map((p) => ({ ...p, store }));

  return (
    <main>
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            { href: `/shop/${store.slug}`, label: store.name },
            { label: product.name },
          ]}
        />
      </Container>

      <Container className="grid gap-10 pt-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <ProductImage product={product} sizes="(max-width: 1024px) 100vw, 600px" className="aspect-square w-full rounded-2xl" priority />
          {product.images.length > 1 && (
            <ul className="grid grid-cols-4 gap-3">
              {product.images.slice(1).map((img) => (
                <li key={img.src} className="relative aspect-square overflow-hidden rounded-xl bg-tile">
                  <Image src={img.src} alt={img.alt} fill sizes="150px" className="object-cover" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-text2">{[product.brand, product.category].filter(Boolean).join(" · ")}</span>
            <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.92] md:text-6xl">{product.name}</h1>
            <p className="font-display text-4xl font-bold leading-none">{productPrice(product)}</p>
            <p className="flex flex-wrap items-center gap-x-2">
              <Availability product={product} />
              {product.updatedAt && <span className="text-xs text-text2">· checked {formatDate.short(product.updatedAt)}</span>}
            </p>
          </div>
          {product.description && <p className="text-[17px] leading-relaxed text-body">{product.description}</p>}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <AskShop product={product} shop={{ name: store.name, whatsapp: store.whatsapp, phone: store.phone, demo: store.demo }} />
          </div>
          <Link href={`/shop/${store.slug}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:shadow-md">
            <StoreLogo store={store} size={56} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] font-bold tracking-[0.08em] text-text2">SOLD BY</span>
              <span className="truncate font-bold">{store.name}</span>
              <span className="text-xs text-text2">
                {store.area}, {store.city}
                {store.hours ? ` · ${store.hours}` : ""}
              </span>
              <StoreBadges store={store} />
            </span>
            <Icon name="arrow" size={18} />
          </Link>
        </div>
      </Container>

      {more.length > 0 && (
        <Container as="section" className="pt-16">
          <SectionHeading title={`More from ${store.name}`} action={{ href: `/shop/${store.slug}`, label: "Visit the shop" }} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {more.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </Container>
      )}
    </main>
  );
}
