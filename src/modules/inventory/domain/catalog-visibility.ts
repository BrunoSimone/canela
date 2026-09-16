import type { ProductTone } from "@/lib/types";

type CatalogProduct = {
  _id: string;
  tone: ProductTone;
};

export function filterCatalogByAvailability<T extends CatalogProduct>(
  products: T[],
  availableProductIds: ReadonlySet<string>,
): T[] {
  return products.filter(
    (product) =>
      product.tone === "encargo" || availableProductIds.has(product._id),
  );
}
