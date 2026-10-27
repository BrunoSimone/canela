import { describe, expect, it } from "vitest";
import type { StorefrontProduct } from "@/lib/types";
import { selectCatalogPreview } from "./catalog-preview";
const image = { asset: { _ref: "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-600x750-jpg" } };
const product = (id: string, category: StorefrontProduct["category"] = "ceramica"): StorefrontProduct => ({ _id: id, name: id, price: 1500, category, sub: "Casa", images: [image], available: true });
describe("PER-144: real catalog preview", () => {
  it("shows category variety before filling with more pieces of the same category", () => {
    const items = [product("taza"), product("cuenco"), product("vaso", "vidrio"), product("espejo", "espejos")];
    const preview = selectCatalogPreview(items);
    expect(preview.map(p => p.id)).toEqual(["taza", "vaso", "espejo", "cuenco"]);
    expect(selectCatalogPreview(items.slice(0, 3)).map(p => p.id)).toEqual(["taza", "vaso", "cuenco"]);
    expect(items.map(p => p._id)).toEqual(["taza", "cuenco", "vaso", "espejo"]);
  });
  it("caps the backdrop at 25 distinct products without changing the catalog", () => {
    const products = Array.from({ length: 30 }, (_, i) => product(`pieza-${i}`));
    const preview = selectCatalogPreview([products[0], ...products]);
    expect(preview).toHaveLength(25);
    expect(new Set(preview.map(p => p.id)).size).toBe(25);
    expect(products).toHaveLength(30);
  });
  it("does not advertise unavailable pieces, unusable prices or missing pictures", () => {
    const p = product("taza");
    expect(selectCatalogPreview([{ ...p, available: false }, { ...p, images: [] }, { ...p, price: 0 }, { ...p, price: NaN }, { ...p, price: -1 }, { ...p, price: Infinity }])).toEqual([]);
    expect(selectCatalogPreview([])).toEqual([]);
    expect(selectCatalogPreview([{ ...p, images: [{}, image] }])).toMatchObject([{ id: "taza" }]);
  });
});
