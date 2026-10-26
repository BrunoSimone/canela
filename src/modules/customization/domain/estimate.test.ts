import { describe, expect, it } from "vitest";
import { estimateFrame, validatePricing } from "./estimate";
import { testWorkshop } from "../testing/workshop";

import { testPricing as pricing } from "../testing/pricing";

describe("PER-131: provisional frame estimate", () => {
  it("quotes exact tile cost, configured labor/supplies and final rounding, excluding shipping", () => {
    expect(estimateFrame(testWorkshop, 30, pricing)).toEqual({
      currency: "ARS", provisional: true, pricingVersion: "test-1", size: 30,
      tilesCents: 5_567_000, laborCents: 6_000_000, suppliesCents: 1_600_000,
      roundingCents: 33_000, totalCents: 13_200_000, shippingCents: null,
    });
  });
  it("covers every intermediate size without reducing the price or mutating configuration", () => {
    const previous = structuredClone(pricing);
    let last = 0;
    for (let size = 2; size <= 45; size++) {
      const estimate = estimateFrame(testWorkshop, size, pricing);
      expect(Number.isSafeInteger(estimate.totalCents)).toBe(true);
      expect(estimate.totalCents).toBeGreaterThanOrEqual(last);
      expect(estimate.totalCents % pricing.roundToCents).toBe(0);
      last = estimate.totalCents;
    }
    expect(pricing).toEqual(previous);
    expect(estimateFrame(testWorkshop, 45, pricing).totalCents).toBe(27_200_000);
  });
  it("interpolates by pieces, not arbitrary size brackets", () => {
    const p = { ...pricing, sizes: [{ cells: 2, laborCents: 100, suppliesCents: 100 }, { cells: 4, laborCents: 1300, suppliesCents: 700 }] };
    const config = { ...testWorkshop, maxCells: 4 };
    expect(estimateFrame(config, 3, p)).toMatchObject({ laborCents: 600, suppliesCents: 350 });
  });
  it.each([0, 46, 2.5, NaN])("rejects invalid design size %s", size => {
    expect(() => estimateFrame(testWorkshop, size, pricing)).toThrow();
  });
  it.each([
    { tilePackQuantity: 0 }, { tilePackCents: -1 }, { tilePackCents: Number.MAX_SAFE_INTEGER },
    { tilePackCents: NaN }, { roundToCents: 0 }, { sizes: [] },
    { sizes: [{ cells: 15, laborCents: 1, suppliesCents: 1 }, { cells: 45, laborCents: 2, suppliesCents: 2 }] },
    { sizes: [{ cells: 2, laborCents: 2, suppliesCents: 1 }, { cells: 45, laborCents: 1, suppliesCents: 1 }] },
    { sizes: [{ cells: 2, laborCents: 1, suppliesCents: 1 }, { cells: 2, laborCents: 2, suppliesCents: 2 }] },
  ])("rejects invalid or uncovered prices %j", change => {
    expect(() => validatePricing(testWorkshop, { ...pricing, ...change })).toThrow();
  });
});
