import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../../../../sanity/env";
import type {
  CatalogProduct,
  ProductCatalog,
} from "../../domain/product-catalog";

const CHECKOUT_PRODUCTS_QUERY = `*[
  _type == "producto" && _id in $productIds
] {
  "id": _id,
  name,
  "priceArs": price,
  tone
}`;

type SanityProductReader = {
  fetch(
    query: string,
    params: { productIds: string[] },
    options: { cache: "no-store"; perspective: "published" },
  ): Promise<unknown>;
};

type SanityCheckoutProduct = {
  id: string;
  name: string;
  priceArs: number;
  tone: string;
};

const authoritativeReader = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

export class SanityProductCatalog implements ProductCatalog {
  constructor(
    private readonly reader: SanityProductReader = authoritativeReader,
  ) {}

  async findByIds(productIds: string[]): Promise<CatalogProduct[]> {
    const result = await this.reader.fetch(
      CHECKOUT_PRODUCTS_QUERY,
      { productIds },
      { cache: "no-store", perspective: "published" },
    );

    if (!Array.isArray(result)) {
      throw new Error("Sanity returned an invalid checkout catalog response");
    }

    return result.filter(isSanityCheckoutProduct).map((product) => ({
      id: product.id,
      name: product.name,
      priceArs: product.priceArs,
      sellable: product.tone !== "encargo",
    }));
  }
}

function isSanityCheckoutProduct(value: unknown): value is SanityCheckoutProduct {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const product = value as Record<string, unknown>;
  return (
    typeof product.id === "string" &&
    typeof product.name === "string" &&
    typeof product.priceArs === "number" &&
    typeof product.tone === "string"
  );
}
