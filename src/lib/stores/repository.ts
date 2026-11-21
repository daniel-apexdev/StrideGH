import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import seed from "../../../data/stores.seed.json";
import { storesFileSchema, type Product, type Store } from "./types";

/** All shops from data/stores.seed.json, checked against the schema (a typo fails loudly with the field name). */
export async function getStores(): Promise<Store[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("stores");
  // Real shops first, then sample ones; alphabetical within each.
  return storesFileSchema.parse(seed).stores.sort((a, b) => Number(a.demo) - Number(b.demo) || a.name.localeCompare(b.name));
}

export async function getStore(slug: string): Promise<Store | null> {
  return (await getStores()).find((s) => s.slug === slug) ?? null;
}

export type ProductWithStore = Product & { store: Pick<Store, "slug" | "name" | "area" | "city" | "demo" | "verification" | "brandColor"> };

export async function getAllProducts(): Promise<ProductWithStore[]> {
  return (await getStores()).flatMap((s) =>
    s.products.map((p) => ({
      ...p,
      store: { slug: s.slug, name: s.name, area: s.area, city: s.city, demo: s.demo, verification: s.verification, brandColor: s.brandColor },
    })),
  );
}
