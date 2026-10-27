import type { StorefrontProduct } from "@/lib/types";
import { hasAsset, urlFor } from "@/sanity/client";

export type CatalogPreview = { id: string; src: string };

/** Prefer category variety, then fill unused places in the catalog's own order. */
export function selectCatalogPreview(products: readonly StorefrontProduct[]): CatalogPreview[] {
  const eligible = products.filter(p => p.available && p.name.trim() && Number.isFinite(p.price) && p.price > 0 && p.images?.some(hasAsset));
  const chosen: StorefrontProduct[] = [];
  for (const category of ["ceramica", "vidrio", "espejos"] as const) {
    const product = eligible.find(p => p.category === category);
    if (product) chosen.push(product);
  }
  for (const product of eligible) {
    if (chosen.length === 25) break;
    if (!chosen.some(p => p._id === product._id)) chosen.push(product);
  }
  return chosen.map(p => ({ id: p._id,
    src: urlFor(p.images.find(hasAsset)!).width(480).fit("max").quality(70).url(),
  }));
}
