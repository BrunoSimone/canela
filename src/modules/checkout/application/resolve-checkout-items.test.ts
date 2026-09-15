import { describe, expect, it, vi } from "vitest";

import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import {
  InvalidCheckoutItemsError,
  ProductNotSellableError,
  resolveCheckoutItems,
} from "./resolve-checkout-items";

function catalogReturning(
  products: Awaited<ReturnType<ProductCatalog["findByIds"]>>,
): ProductCatalog {
  return { findByIds: vi.fn().mockResolvedValue(products) };
}

describe("resolveCheckoutItems", () => {
  it("uses published names and prices from the catalog", async () => {
    const catalog = catalogReturning([
      {
        id: "product-a",
        name: "Nombre publicado",
        priceArs: 15_000,
        sellable: true,
      },
    ]);

    const items = await resolveCheckoutItems(catalog, [
      { productId: "product-a", quantity: 2 },
    ]);

    expect(items).toEqual([
      {
        productId: "product-a",
        name: "Nombre publicado",
        unitPriceCents: 1_500_000,
        quantity: 2,
      },
    ]);
  });

  it("rejects missing or non-sellable products as one checkout", async () => {
    const catalog = catalogReturning([
      {
        id: "product-a",
        name: "Disponible",
        priceArs: 15_000,
        sellable: true,
      },
      {
        id: "custom-piece",
        name: "Por encargo",
        priceArs: 20_000,
        sellable: false,
      },
    ]);

    await expect(
      resolveCheckoutItems(catalog, [
        { productId: "product-a", quantity: 1 },
        { productId: "missing", quantity: 1 },
        { productId: "custom-piece", quantity: 1 },
      ]),
    ).rejects.toEqual(
      new ProductNotSellableError(["custom-piece", "missing"]),
    );
  });

  it("rejects duplicate products and invalid quantities before querying Sanity", async () => {
    const catalog = catalogReturning([]);

    await expect(
      resolveCheckoutItems(catalog, [
        { productId: "product-a", quantity: 1 },
        { productId: "product-a", quantity: 1 },
      ]),
    ).rejects.toBeInstanceOf(InvalidCheckoutItemsError);
    await expect(
      resolveCheckoutItems(catalog, [{ productId: "product-a", quantity: 1.5 }]),
    ).rejects.toBeInstanceOf(InvalidCheckoutItemsError);
    expect(catalog.findByIds).not.toHaveBeenCalled();
  });
});
