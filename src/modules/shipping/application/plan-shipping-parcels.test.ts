import { describe, expect, it, vi } from "vitest";

import {
  InvalidParcelPlanError,
  MissingShippingProfileError,
} from "../domain/parcel-plan";
import { planShippingParcels, UnshippableProductError } from "./plan-shipping-parcels";

const constraints = {
  maxWeightGrams: 25_000,
  maxHeightCm: 150,
  maxWidthCm: 150,
  maxLengthCm: 150,
  maxUnits: 10,
};

describe("planShippingParcels", () => {
  it("uses only the published profile returned by the server-side catalog", async () => {
    const catalog = { findByIds: vi.fn().mockResolvedValue([{
      id: "plate",
      sellable: true,
      profile: {
        productId: "plate",
        version: 1,
        weightGrams: 900,
        heightCm: 12,
        widthCm: 24,
        lengthCm: 24,
        shipSeparately: false,
      },
    }]) };

    const plan = await planShippingParcels(
      { catalog, groupingRules: [], constraints },
      [{ productId: "plate", quantity: 2 }],
    );

    expect(catalog.findByIds).toHaveBeenCalledWith(["plate"]);
    expect(plan.parcels).toHaveLength(2);
    expect(plan.parcels[0]?.weightGrams).toBe(900);
  });

  it("rejects unavailable products or a missing profile before any provider call", async () => {
    const ineligible = { findByIds: vi.fn().mockResolvedValue([{
      id: "commission", sellable: false, profile: null,
    }]) };
    await expect(planShippingParcels(
      { catalog: ineligible, groupingRules: [], constraints },
      [{ productId: "commission", quantity: 1 }],
    )).rejects.toBeInstanceOf(UnshippableProductError);

    const missingProfile = { findByIds: vi.fn().mockResolvedValue([{
      id: "plate", sellable: true, profile: null,
    }]) };
    await expect(planShippingParcels(
      { catalog: missingProfile, groupingRules: [], constraints },
      [{ productId: "plate", quantity: 1 }],
    )).rejects.toBeInstanceOf(MissingShippingProfileError);
  });

  it("rejects invalid cart lines before reading the catalog", async () => {
    const catalog = { findByIds: vi.fn() };

    await expect(planShippingParcels(
      { catalog, groupingRules: [], constraints },
      [{ productId: "plate", quantity: 0 }],
    )).rejects.toBeInstanceOf(InvalidParcelPlanError);

    expect(catalog.findByIds).not.toHaveBeenCalled();
  });

  it("discards client-supplied package fields from the parcel plan", async () => {
    const catalog = { findByIds: vi.fn().mockResolvedValue([{
      id: "plate",
      sellable: true,
      profile: {
        productId: "plate",
        version: 1,
        weightGrams: 900,
        heightCm: 12,
        widthCm: 24,
        lengthCm: 24,
        shipSeparately: false,
      },
    }]) };
    const untrustedItem = { productId: "plate", quantity: 1, weightGrams: 1 };

    const plan = await planShippingParcels(
      { catalog, groupingRules: [], constraints },
      [untrustedItem],
    );

    expect(plan.items).toEqual([{ productId: "plate", quantity: 1 }]);
    expect(plan.parcels[0]?.weightGrams).toBe(900);
    expect(plan.parcels[0]?.items).toEqual([{ productId: "plate", quantity: 1 }]);
  });
});
