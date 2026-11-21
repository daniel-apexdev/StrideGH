import Image from "next/image";
import Link from "next/link";
import { availabilityLabel, availabilityTone, categoryIcon, initials, onColor, productPrice } from "@/lib/stores/format";
import type { ProductWithStore } from "@/lib/stores/repository";
import type { Product, Store } from "@/lib/stores/types";

/** Shop logo, or its initials on the brand colour when there's no logo yet. */
export function StoreLogo({ store, size = 56, className = "" }: { store: Pick<Store, "name" | "logo" | "brandColor">; size?: number; className?: string }) {
  if (store.logo) {
    return (
      <Image
        src={store.logo.src}
        alt={store.logo.alt}
        width={size}
        height={size}
        className={`shrink-0 rounded-[14px] bg-surface object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[14px] font-display font-extrabold ${className}`}
      style={{ width: size, height: size, background: store.brandColor, color: onColor(store.brandColor), fontSize: size * 0.34 }}
    >
      {initials(store.name)}
    </span>
  );
}

/** The product's first photo, or a line drawing of its category on a tile. */
export function ProductImage({ product, sizes, className = "", priority }: { product: Product; sizes: string; className?: string; priority?: boolean }) {
  const img = product.images[0];
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-tile ${className}`}>
      {img ? (
        <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--icon)" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" aria-hidden>
          <path d={categoryIcon[product.category]} />
        </svg>
      )}
    </div>
  );
}

const toneCls = { ok: "text-ok-fg", warn: "text-warn-fg", neutral: "text-text2" } as const;

export function Availability({ product }: { product: Pick<Product, "availability"> }) {
  return <span className={`text-xs font-semibold ${toneCls[availabilityTone[product.availability]]}`}>{availabilityLabel[product.availability]}</span>;
}

export function ProductCard({ product, showStore }: { product: ProductWithStore | (Product & { store: Pick<Store, "slug" | "name"> }); showStore?: boolean }) {
  return (
    <Link href={`/shop/${product.store.slug}/${product.slug}`} className="group flex min-w-0 flex-col gap-1.5">
      <ProductImage product={product} sizes="(max-width: 640px) 45vw, 280px" className="aspect-square transition group-hover:brightness-95" />
      <span className="mt-1 text-[15px] font-semibold leading-tight group-hover:underline">{product.name}</span>
      <span className="font-display text-[22px] font-bold leading-none">{productPrice(product)}</span>
      <Availability product={product} />
      {showStore && <span className="truncate text-xs text-text2">{product.store.name}</span>}
    </Link>
  );
}

export function StoreBadges({ store }: { store: Pick<Store, "verification" | "demo"> }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {store.demo ? (
        <span className="rounded-[5px] bg-neu-bg px-2 py-1 text-xs font-bold text-neu-fg">SAMPLE SHOP</span>
      ) : store.verification === "verified" ? (
        <span className="rounded-[5px] bg-ok-bg px-2 py-1 text-xs font-bold text-ok-fg">Verified shop</span>
      ) : (
        <span className="rounded-[5px] bg-neu-bg px-2 py-1 text-xs font-bold text-neu-fg">Verification pending</span>
      )}
    </span>
  );
}
