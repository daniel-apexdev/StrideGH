"use client";

import { useState } from "react";
import { askAboutProduct, telLink, whatsappLink } from "@/lib/stores/format";
import type { Product } from "@/lib/stores/types";
import { Icon } from "../icon";

/** Pick a size and colour, then message the shop on WhatsApp with them filled in. */
export function AskShop({
  product,
  shop,
}: {
  product: Pick<Product, "name" | "sizes" | "soldOutSizes" | "colours" | "availability">;
  shop: { name: string; whatsapp: string | null; phone: string | null; demo: boolean };
}) {
  const [size, setSize] = useState<string | null>(null);
  const [colour, setColour] = useState<string | null>(product.colours.length === 1 ? product.colours[0] : null);
  const chip = (on: boolean, off = false) =>
    `flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold ${
      off ? "border-line text-text2 line-through opacity-50" : on ? "border-sel bg-sel text-on-sel" : "border-line bg-surface"
    }`;

  return (
    <div className="flex flex-col gap-4">
      {product.sizes.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">
            Size {size && <span className="font-normal text-text2">· {size}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => {
              const out = product.soldOutSizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  aria-pressed={size === s}
                  aria-label={out ? `${s}, sold out` : s}
                  onClick={() => setSize(size === s ? null : s)}
                  className={chip(size === s, out)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {product.colours.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">
            Colour {colour && <span className="font-normal text-text2">· {colour}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colours.map((c) => (
              <button key={c} type="button" aria-pressed={colour === c} onClick={() => setColour(colour === c ? null : c)} className={chip(colour === c)}>
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {shop.demo ? (
        <p className="rounded-xl bg-neu-bg p-3.5 text-sm text-neu-fg">This is a sample shop, so it can&apos;t be contacted. Real shops show WhatsApp and call buttons here.</p>
      ) : shop.whatsapp || shop.phone ? (
        <div className="flex flex-col gap-2.5">
          {shop.whatsapp && (
            <a
              href={whatsappLink(shop.whatsapp, askAboutProduct(product, { size: size ?? undefined, colour: colour ?? undefined }))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-primary font-bold text-on-primary"
            >
              <Icon name="message" size={18} />
              Ask {shop.name} on WhatsApp
            </a>
          )}
          {shop.phone && (
            <a href={telLink(shop.phone)} className="flex h-[52px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-outline font-semibold">
              <Icon name="phone" size={18} />
              Call the shop
            </a>
          )}
          <p className="text-xs text-text2">You arrange payment and collection or delivery with the shop. Stride GH doesn&apos;t take payments yet.</p>
        </div>
      ) : (
        <p className="rounded-xl bg-neu-bg p-3.5 text-sm text-neu-fg">Contact details for this shop are coming soon.</p>
      )}
    </div>
  );
}
