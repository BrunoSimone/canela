import { describe, expect, it } from "vitest";

import {
  buildParcelPlan,
  InvalidParcelPlanError,
  MissingShippingProfileError,
  ParcelLimitExceededError,
  type BuildParcelPlanInput,
  type ShippingProfile,
} from "./parcel-plan";

const plate: ShippingProfile = {
  productId: "plate",
  version: 1,
  weightGrams: 900,
  heightCm: 12,
  widthCm: 24,
  lengthCm: 24,
  shipSeparately: false,
};

const glass: ShippingProfile = {
  productId: "glass",
  version: 1,
  weightGrams: 600,
  heightCm: 18,
  widthCm: 16,
  lengthCm: 16,
  shipSeparately: false,
};

function input(overrides: Partial<BuildParcelPlanInput> = {}): BuildParcelPlanInput {
  return {
    items: [
      { productId: "plate", quantity: 2 },
      { productId: "glass", quantity: 1 },
    ],
    profiles: [plate, glass],
    groupingRules: [],
    constraints: {
      maxWeightGrams: 25_000,
      maxHeightCm: 150,
      maxWidthCm: 150,
      maxLengthCm: 150,
      maxUnits: 10,
    },
    ...overrides,
  };
}

const commonBox = {
  id: "approved-combination",
  version: 1,
  items: [
    { productId: "glass", quantity: 1 },
    { productId: "plate", quantity: 2 },
  ],
  parcel: { weightGrams: 2_200, heightCm: 30, widthCm: 35, lengthCm: 35 },
};

describe("buildParcelPlan", () => {
  it("uses one protected parcel per unit when no approved combination matches", () => {
    const plan = buildParcelPlan(input());

    expect(plan.items).toEqual([
      { productId: "glass", quantity: 1 },
      { productId: "plate", quantity: 2 },
    ]);
    expect(plan.parcels).toHaveLength(3);
    expect(plan.parcels.map((parcel) => parcel.items)).toEqual([
      [{ productId: "glass", quantity: 1 }],
      [{ productId: "plate", quantity: 1 }],
      [{ productId: "plate", quantity: 1 }],
    ]);
    expect(plan.parcels.every((parcel) => parcel.groupingRule === null)).toBe(true);
  });

  it("uses an approved exact-cart rule for one exterior box", () => {
    const plan = buildParcelPlan(input({ groupingRules: [commonBox] }));

    expect(plan.parcels).toEqual([{
      ...commonBox.parcel,
      items: plan.items,
      groupingRule: { id: commonBox.id, version: commonBox.version },
    }]);
  });

  it("never uses a rule for a different quantity or a product that ships alone", () => {
    const differentQuantity = buildParcelPlan(input({
      items: [{ productId: "plate", quantity: 1 }],
      groupingRules: [commonBox],
    }));
    expect(differentQuantity.parcels).toHaveLength(1);
    expect(differentQuantity.parcels[0]?.groupingRule).toBeNull();

    expect(() => buildParcelPlan(input({
      profiles: [{ ...plate, shipSeparately: true }, glass],
      groupingRules: [commonBox],
    }))).toThrow(InvalidParcelPlanError);
  });

  it("rejects missing, malformed or duplicate profile data", () => {
    expect(() => buildParcelPlan(input({ profiles: [plate] }))).toThrow(
      MissingShippingProfileError,
    );
    expect(() => buildParcelPlan(input({ profiles: [{ ...plate, weightGrams: 0 }, glass] })))
      .toThrow(InvalidParcelPlanError);
    expect(() => buildParcelPlan(input({ profiles: [plate, plate, glass] })))
      .toThrow(InvalidParcelPlanError);
  });

  it("rejects parcels beyond the configured contract limits", () => {
    expect(() => buildParcelPlan(input({
      constraints: { ...input().constraints, maxWeightGrams: 800 },
    }))).toThrow(ParcelLimitExceededError);
    expect(() => buildParcelPlan(input({
      groupingRules: [{ ...commonBox, parcel: { ...commonBox.parcel, lengthCm: 151 } }],
    }))).toThrow(ParcelLimitExceededError);
    expect(() => buildParcelPlan(input({
      constraints: { ...input().constraints, maxCombinedCm: 50 },
    }))).toThrow(ParcelLimitExceededError);
  });

  it("rejects ambiguous rules and excessive quantities before making parcels", () => {
    expect(() => buildParcelPlan(input({
      groupingRules: [commonBox, { ...commonBox, id: "another" }],
    }))).toThrow(InvalidParcelPlanError);
    expect(() => buildParcelPlan(input({
      items: [{ productId: "plate", quantity: 11 }],
    }))).toThrow(InvalidParcelPlanError);
    expect(buildParcelPlan(input({
      groupingRules: [{
        ...commonBox,
        items: [{ productId: "plate", quantity: 11 }],
      }],
    })).parcels).toHaveLength(3);
  });

  it("keeps a stable fingerprint across input order and changes it with the profile", () => {
    const first = buildParcelPlan(input());
    const reordered = buildParcelPlan(input({
      items: [...input().items].reverse(),
      profiles: [glass, {
        shipSeparately: plate.shipSeparately,
        lengthCm: plate.lengthCm,
        widthCm: plate.widthCm,
        heightCm: plate.heightCm,
        weightGrams: plate.weightGrams,
        version: plate.version,
        productId: plate.productId,
      }],
    }));
    const revised = buildParcelPlan(input({
      profiles: [{ ...plate, version: 2 }, glass],
    }));

    expect(reordered.fingerprint).toBe(first.fingerprint);
    expect(revised.fingerprint).not.toBe(first.fingerprint);
  });
});
