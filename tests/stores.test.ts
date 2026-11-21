import { describe, expect, it } from "vitest";
import seed from "../data/stores.seed.json";
import { askAboutProduct, initials, onColor, productPrice, whatsappLink } from "@/lib/stores/format";
import { storesFileSchema } from "@/lib/stores/types";

describe("stores data", () => {
  it("data/stores.seed.json matches the schema", () => {
    const r = storesFileSchema.safeParse(seed);
    if (!r.success) throw new Error(r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
    expect(r.data.stores.length).toBeGreaterThan(0);
  });

  it("points every photo at public/stores or https", () => {
    const bad = storesFileSchema.safeParse({ stores: [{ slug: "x", name: "X", description: "d", area: "a", city: "c", region: "r", logo: { src: "logo.jpg", width: 1, height: 1, alt: "a" } }] });
    expect(bad.success).toBe(false);
  });

  it("catches duplicate product slugs in a shop", () => {
    const p = { slug: "a", name: "A", category: "Shoes", priceMinor: null };
    const r = storesFileSchema.safeParse({ stores: [{ slug: "x", name: "X", description: "d", area: "a", city: "c", region: "r", products: [p, p] }] });
    expect(r.success).toBe(false);
  });
});

describe("store helpers", () => {
  it("formats prices and contact links", () => {
    expect(productPrice({ priceMinor: 145000, currency: "GHS" })).toBe("GHS 1,450");
    expect(productPrice({ priceMinor: 9550, currency: "GHS" })).toBe("GHS 95.50");
    expect(productPrice({ priceMinor: null, currency: "GHS" })).toBe("Price on request");
    expect(whatsappLink("+233 24 123 4567", "Hi")).toBe("https://wa.me/233241234567?text=Hi");
    expect(askAboutProduct({ name: "Tempo Trainer" }, { size: "42", colour: "Black" })).toBe(
      "Hi! I found the Tempo Trainer (size 42, Black) on Stride GH. Is it available?",
    );
    expect(initials("Osu Run Supply")).toBe("ORS");
    expect(onColor("#C6F24E")).toBe("#111714");
    expect(onColor("#0E3B2C")).toBe("#F4F2EC");
  });
});
