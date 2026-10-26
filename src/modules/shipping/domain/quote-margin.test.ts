import { describe, expect, it } from "vitest";
import { buildMarginParcels, DEFAULT_QUOTE_MARGIN } from "./quote-margin";
import { ZIPNOVA_INPUT_CONSTRAINTS as limits } from "../infrastructure/server/shipping-config";
import type { PlannedParcel } from "./parcel-plan";

const parcel: PlannedParcel = { weightGrams: 2201, heightCm: 15, widthCm: 20, lengthCm: 30, items: [{ productId: "piece", quantity: 2 }], groupingRule: null };
describe("MAR-01: margin on the complete box", () => {
  it("rounds 5% upwards once after tare, adds one cm per outer dimension and does not mutate the plan", () => {
    const source = structuredClone(parcel);
    expect(buildMarginParcels([source], DEFAULT_QUOTE_MARGIN, limits)).toEqual([{ ...parcel, weightGrams: 2312, heightCm: 16, widthCm: 21, lengthCm: 31 }]);
    expect(source).toEqual(parcel);
  });
  it("caps extra weight at 200 g", () => {
    expect(buildMarginParcels([{ ...parcel, weightGrams: 6000 }], DEFAULT_QUOTE_MARGIN, limits)?.[0].weightGrams).toBe(6200);
  });
  it("does not enlarge usable packing space or change placements", () => {
    const packing = { boxId: "box", boxName: "Caja", boxRevision: "r1", maxWeightGrams: 3000, placements: [{ productId: "piece", unit: 1, x: 0, y: 0, z: 0, widthCm: 5, lengthCm: 5, heightCm: 5 }] };
    expect(buildMarginParcels([{ ...parcel, packing }], DEFAULT_QUOTE_MARGIN, limits)?.[0].packing).toEqual(packing);
    expect(buildMarginParcels([{ ...parcel, packing: { ...packing, maxWeightGrams: 2250 } }], DEFAULT_QUOTE_MARGIN, limits)).toBeNull();
  });
  it.each([{ maxWeightGrams: 2300 }, { maxHeightCm: 15 }, { maxWidthCm: 20 }, { maxLengthCm: 30 }, { maxCombinedCm: 67 }])("does not exceed input limits: %j", constraint => {
    expect(buildMarginParcels([parcel], DEFAULT_QUOTE_MARGIN, { ...limits, ...constraint })).toBeNull();
  });
});
