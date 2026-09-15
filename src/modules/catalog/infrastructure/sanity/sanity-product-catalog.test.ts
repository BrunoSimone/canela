import { describe, expect, it, vi } from "vitest";

import { SanityProductCatalog } from "./sanity-product-catalog";

describe("SanityProductCatalog", () => {
  it("reads only requested published fields and marks commissions non-sellable", async () => {
    const fetch = vi.fn().mockResolvedValue([
      { id: "available", name: "Disponible", priceArs: 15_000, tone: "unica" },
      { id: "commission", name: "Encargo", priceArs: 20_000, tone: "encargo" },
    ]);
    const catalog = new SanityProductCatalog({ fetch });

    const result = await catalog.findByIds(["available", "commission"]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('_id in $productIds'),
      { productIds: ["available", "commission"] },
      { cache: "no-store", perspective: "published" },
    );
    expect(result).toEqual([
      { id: "available", name: "Disponible", priceArs: 15_000, sellable: true },
      { id: "commission", name: "Encargo", priceArs: 20_000, sellable: false },
    ]);
  });
});
