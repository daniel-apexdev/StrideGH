"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ProductWithStore } from "@/lib/stores/repository";
import { productCategories } from "@/lib/stores/types";
import { ProductCard } from "./shop-bits";

type Props = {
  products: ProductWithStore[];
  /** Where the category links point: "/shop" or "/shop/osu-run-supply". */
  basePath: string;
  layout: "sidebar" | "chips";
  showStore?: boolean;
  /** Shown in the heading on a shop's own page. */
  total?: number;
};

/** Reads ?cat= from the address bar. Render inside <Suspense>. */
export function CatalogueLive(props: Props) {
  return <Catalogue {...props} cat={useSearchParams().get("cat")} />;
}

/** Category filter and product grid. Filters in the browser, so it works on static hosting too. */
export function Catalogue({ products: all, basePath, layout, showStore, cat }: Props & { cat: string | null }) {
  const present = productCategories.filter((c) => all.some((p) => p.category === c));
  const active = cat && (present as string[]).includes(cat) ? cat : null;
  const products = active ? all.filter((p) => p.category === active) : all;
  const href = (c: string | null) => (c ? `${basePath}?cat=${encodeURIComponent(c)}` : basePath);

  const grid = products.length ? (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 ${layout === "sidebar" ? "xl:grid-cols-4" : ""}`}>
      {products.map((p) => (
        <ProductCard key={`${p.store.slug}/${p.slug}`} product={p} showStore={showStore} />
      ))}
    </div>
  ) : (
    <p className="text-text2">No products listed yet.</p>
  );

  if (layout === "chips") {
    return (
      <section aria-label="Products" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-4xl font-extrabold uppercase leading-none">Products</h2>
          <span className="text-sm text-text2">
            {products.length} of {all.length}
          </span>
        </div>
        {present.length > 1 && (
          <nav aria-label="Categories" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
            {[null, ...present].map((c) => (
              <Link
                key={c ?? "all"}
                href={href(c)}
                scroll={false}
                aria-current={c === active ? "page" : undefined}
                className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${
                  c === active ? "border-sel bg-sel text-on-sel" : "border-line bg-surface hover:bg-tile"
                }`}
              >
                {c ?? "All"}
              </Link>
            ))}
          </nav>
        )}
        {grid}
      </section>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside aria-label="Categories">
        <nav className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
          <span className="mb-1 hidden px-3 text-xs font-bold tracking-[0.1em] text-text2 lg:block">CATEGORY</span>
          {[null, ...present].map((c) => {
            const on = c === active;
            const n = c ? all.filter((p) => p.category === c).length : all.length;
            return (
              <Link
                key={c ?? "all"}
                href={href(c)}
                aria-current={on ? "page" : undefined}
                scroll={false}
                className={`flex h-10 shrink-0 items-center justify-between gap-3 rounded-full border px-4 text-sm font-semibold lg:rounded-lg lg:border-0 lg:px-3 ${
                  on ? "border-sel bg-sel text-on-sel lg:bg-tile lg:text-text" : "border-line bg-surface lg:bg-transparent lg:hover:bg-tile"
                }`}
              >
                {c ?? "All gear"}
                <span className={`hidden text-xs lg:inline ${on ? "" : "text-text2"}`}>{n}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <section aria-label="Products">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="font-display text-3xl font-extrabold uppercase">{active ?? "All gear"}</h2>
          <span className="text-sm text-text2">{products.length} items</span>
        </div>
        {grid}
      </section>
    </div>
  );
}
