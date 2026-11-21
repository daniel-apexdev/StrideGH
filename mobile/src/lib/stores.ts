/**
 * Local shops and their products. Mirrors the website's src/lib/stores/types.ts and format.ts;
 * the data comes from /api/stores (or the bundled data/stores.seed.json when offline).
 */
import { formatDate } from './races';

export type ProductCategory = 'Shoes' | 'Apparel' | 'Hydration' | 'Watches' | 'Accessories' | 'Nutrition' | 'Recovery';
export type Availability = 'in_stock' | 'low_stock' | 'out_of_stock' | 'ask';
export type StoreImage = { src: string; width: number; height: number; alt: string };

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  brand?: string | null;
  priceMinor: number | null;
  currency?: string;
  availability?: Availability;
  sizes?: string[];
  soldOutSizes?: string[];
  colours?: string[];
  description?: string | null;
  images?: StoreImage[];
  updatedAt?: string | null;
};

export type Store = {
  slug: string;
  name: string;
  demo?: boolean;
  verification?: 'verified' | 'pending';
  description: string;
  area: string;
  address?: string | null;
  city: string;
  region: string;
  hours?: string | null;
  collection?: boolean;
  delivery?: string | null;
  payments?: string[];
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  website?: string | null;
  logo?: StoreImage | null;
  cover?: StoreImage | null;
  brandColor?: string;
  products: Product[];
};

export type ProductWithStore = Product & { store: Store };

export const categoryOrder: ProductCategory[] = ['Shoes', 'Apparel', 'Hydration', 'Watches', 'Accessories', 'Nutrition', 'Recovery'];

export function sortStores(stores: Store[]): Store[] {
  return [...stores].sort((a, b) => Number(!!a.demo) - Number(!!b.demo) || a.name.localeCompare(b.name));
}

export function allProducts(stores: Store[]): ProductWithStore[] {
  return stores.flatMap((s) => s.products.map((p) => ({ ...p, store: s })));
}

export function productPrice(p: Pick<Product, 'priceMinor' | 'currency'>): string {
  if (p.priceMinor === null) return 'Price on request';
  const v = p.priceMinor / 100;
  return `${p.currency ?? 'GHS'} ${v.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export const availabilityLabel: Record<Availability, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Sold out',
  ask: 'Ask the shop about stock',
};

export const checkedLabel = (p: Product) => (p.updatedAt ? `checked ${formatDate.short(p.updatedAt)}` : null);

export function initials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return (words.length >= 2 ? words.slice(0, 3).map((w) => w[0]) : [name.slice(0, 2)]).join('').toUpperCase();
}

export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#111714' : '#F4F2EC';
}

const digits = (phone: string) => phone.replace(/\D/g, '');
export const whatsappLink = (phone: string, text?: string) =>
  `https://wa.me/${digits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
export const telLink = (phone: string) => `tel:+${digits(phone)}`;
export const mapsLink = (s: Store) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address ?? s.area, s.city, 'Ghana'].join(', '))}`;
export const instagramLink = (handle: string) => `https://instagram.com/${handle.replace(/^@/, '')}`;

export function askAboutProduct(p: Pick<Product, 'name'>, opts: { size?: string | null; colour?: string | null } = {}): string {
  const extra = [opts.size && `size ${opts.size}`, opts.colour].filter(Boolean).join(', ');
  return `Hi! I found the ${p.name}${extra ? ` (${extra})` : ''} on Stride GH. Is it available?`;
}

/** Line drawing per category, used until a product has a photo. */
export const categoryIcon: Record<ProductCategory, string> = {
  Shoes: 'M2.5 17.5h19v2h-19zM2.5 17.5c0-3 .8-7 2.5-8.5l3.5 3 4-2.5 3 2.2c3.6.3 6 2 6 5.8',
  Apparel: 'M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-1 2-2.5 3-4 3S9 5 8 3z',
  Hydration: 'M10 2h4v3l2 3v13H8V8l2-3zM8 12h8',
  Watches: 'M8 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM9 6V2h6v4M9 18v4h6v-4M12 9v3l2 1',
  Accessories: 'M3 15a9 8 0 0 1 18 0zM12 15h10M7 10l2 1',
  Nutrition: 'M7 3h10l-1 18H8zM7 8h10',
  Recovery: 'M4 12h16M7 8v8M17 8v8M4 10v4M20 10v4',
};
