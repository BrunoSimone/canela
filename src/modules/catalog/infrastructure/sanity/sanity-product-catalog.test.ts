import { describe, expect, it, vi } from "vitest";
import { SanityProductCatalog } from "./sanity-product-catalog";

describe("STK-02 SanityProductCatalog", () => {
  it("accepts published products without modes and ignores old unique/commission limits", async () => {
    const fetch = vi.fn().mockResolvedValue([
      { id: "new", name: "Nueva", priceArs: 15_000 },
      { id: "old-unique", name: "Anterior", priceArs: 20_000, tone: "unica" },
      { id: "old-commission", name: "Anterior", priceArs: 20_000, tone: "encargo" },
    ]);
    const result = await new SanityProductCatalog({ fetch }).findByIds(["new", "old-unique", "old-commission"]);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('_id in $productIds'),
      { productIds: ["new", "old-unique", "old-commission"] }, { cache: "no-store", perspective: "published" });
    expect(result).toHaveLength(3);
    for (const p of result) { expect(p.sellable).toBe(true); expect(p.maxQuantity).toBeUndefined(); }
  });
});
