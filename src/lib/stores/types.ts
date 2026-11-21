import { z } from "zod";

/**
 * Local running shops and what they sell. The data lives in data/stores.seed.json
 * (see public/stores/README.md for how to add a shop and its photos).
 */

export const productCategories = ["Shoes", "Apparel", "Hydration", "Watches", "Accessories", "Nutrition", "Recovery"] as const;
export type ProductCategory = (typeof productCategories)[number];

export const availabilityStates = ["in_stock", "low_stock", "out_of_stock", "ask"] as const;
export type Availability = (typeof availabilityStates)[number];

export const paymentMethods = ["Mobile Money", "Card", "Cash", "Bank transfer"] as const;

/** A photo in public/stores/… (or a full https URL). Width/height are its real pixel size. */
export const storeImageSchema = z.object({
  src: z.string().refine((s) => s.startsWith("/stores/") || s.startsWith("https://"), "Use /stores/... or an https URL"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
});
export type StoreImage = z.infer<typeof storeImageSchema>;

const phone = z
  .string()
  .regex(/^\+\d{1,3} [\d ]{6,16}$/, 'Write numbers with the country code, e.g. "+233 24 123 4567"')
  .nullable()
  .default(null);

export const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: z.enum(productCategories),
  brand: z.string().nullable().default(null),
  /** Price in pesewas (GHS 1,450 → 145000). null = "Price on request". */
  priceMinor: z.number().int().nonnegative().nullable(),
  currency: z.string().length(3).default("GHS"),
  availability: z.enum(availabilityStates).default("ask"),
  /** Sizes as the shop writes them ("42", "M", "UK 9"). Empty = one size. */
  sizes: z.array(z.string()).default([]),
  soldOutSizes: z.array(z.string()).default([]),
  colours: z.array(z.string()).default([]),
  description: z.string().nullable().default(null),
  /** Up to a few photos; the first is the main one. */
  images: z.array(storeImageSchema).default([]),
  /** When the shop last confirmed price and stock, YYYY-MM-DD. */
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});
export type Product = z.infer<typeof productSchema>;

export const storeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** true for made-up example shops. They show a "Sample shop" label and no contact buttons. */
  demo: z.boolean().default(false),
  /** "verified" only after you've checked the business and visited or video-called the shop. */
  verification: z.enum(["verified", "pending"]).default("pending"),
  verifiedAt: z.string().nullable().default(null),
  description: z.string().min(1),
  /** Neighbourhood shown on cards, e.g. "Osu". */
  area: z.string().min(1),
  address: z.string().nullable().default(null),
  city: z.string().min(1),
  region: z.string().min(1),
  /** Opening hours as people say them: "Mon–Sat · 9:00–19:00". */
  hours: z.string().nullable().default(null),
  collection: z.boolean().default(true),
  /** Where they deliver, e.g. "Within Accra and Tema". null = no delivery. */
  delivery: z.string().nullable().default(null),
  payments: z.array(z.enum(paymentMethods)).default([]),
  phone,
  whatsapp: phone,
  instagram: z.string().nullable().default(null),
  website: z.string().url().nullable().default(null),
  /** Square logo. Without one, the shop's initials show on its brand colour. */
  logo: storeImageSchema.nullable().default(null),
  /** Wide photo of the shop front or inside (about 3:2). */
  cover: storeImageSchema.nullable().default(null),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#0E3B2C"),
  products: z.array(productSchema).default([]),
});
export type Store = z.infer<typeof storeSchema>;

export const storesFileSchema = z.object({ stores: z.array(storeSchema) }).superRefine((f, ctx) => {
  const seen = new Set<string>();
  f.stores.forEach((s, i) => {
    if (seen.has(s.slug)) ctx.addIssue({ code: "custom", path: ["stores", i, "slug"], message: `Two shops use the slug "${s.slug}"` });
    seen.add(s.slug);
    const ps = new Set<string>();
    s.products.forEach((p, j) => {
      if (ps.has(p.slug)) ctx.addIssue({ code: "custom", path: ["stores", i, "products", j, "slug"], message: `"${s.slug}" has two products called "${p.slug}"` });
      ps.add(p.slug);
    });
  });
});
