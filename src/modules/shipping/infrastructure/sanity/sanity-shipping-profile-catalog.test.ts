import { describe, expect, it, vi } from "vitest";

import { SanityShippingProfileCatalog } from "./sanity-shipping-profile-catalog";

describe("SanityShippingProfileCatalog", () => {
  it("reads only published profiles from the origin catalog", async () => {
    const fetch = vi.fn().mockResolvedValue([
      {
        id: "plate",
        tone: "stock",
        shippingProfile: {
          version: 2,
          weightGrams: 900,
          heightCm: 12,
          widthCm: 24,
          lengthCm: 24,
          shipSeparately: false,
        },
      },
      { id: "commission", tone: "encargo", shippingProfile: null },
    ]);
    const catalog = new SanityShippingProfileCatalog({ fetch });

    const result = await catalog.findByIds(["plate", "commission"]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('_id in $productIds'),
      { productIds: ["plate", "commission"] },
      { cache: "no-store", perspective: "published" },
    );
    expect(result).toEqual([
      {
        id: "plate",
        sellable: true,
        profile: {
          productId: "plate",
          version: 2,
          weightGrams: 900,
          heightCm: 12,
          widthCm: 24,
          lengthCm: 24,
          shipSeparately: false,
        },
      },
      { id: "commission", sellable: false, profile: null },
    ]);
  });

  it("does not accept a partially entered profile as a valid package", async () => {
    const catalog = new SanityShippingProfileCatalog({
      fetch: vi.fn().mockResolvedValue([{
        id: "plate",
        tone: "stock",
        shippingProfile: { version: 1, weightGrams: 900 },
      }]),
    });

    await expect(catalog.findByIds(["plate"])).rejects.toThrow(
      "invalid shipping profile",
    );
  });
});
