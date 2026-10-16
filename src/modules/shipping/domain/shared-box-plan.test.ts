import { describe, expect, it } from "vitest";
import { buildSharedBoxPlan, type ShippingBox } from "./shared-box-plan";
import type { ShippingProfile } from "./parcel-plan";

const constraints = { maxUnits: 20, maxWeightGrams: 20000, maxHeightCm: 100, maxWidthCm: 100, maxLengthCm: 100 };
const box: ShippingBox = { id: "small", revision: "r1", name: "Chica", innerHeightCm: 10, innerWidthCm: 20, innerLengthCm: 20, heightCm: 12, widthCm: 22, lengthCm: 22, tareWeightGrams: 200, maxWeightGrams: 10000 };
const profile: ShippingProfile = { productId: "a", version: 1, weightGrams: 100, heightCm: 10, widthCm: 10, lengthCm: 10, shipSeparately: false, classificationId: "fragile" };
function plan(profiles = [profile], quantity = 2, boxes = [box]) { return buildSharedBoxPlan({ items: profiles.map(p => ({ productId: p.productId, quantity })), profiles, boxes, constraints }); }

describe("shared box", () => {
  it("packs distinct products and quantities in one box, charging tare once", () => {
    const result = plan([profile, { ...profile, productId: "b" }]);
    expect(result.parcels).toHaveLength(1);
    expect(result.parcels[0].weightGrams).toBe(600);
    expect(result.parcels[0].packing?.placements).toHaveLength(4);
  });
  it("rejects excess count even when total volume would fit", () => {
    expect(() => plan([{ ...profile, widthCm: 11, lengthCm: 11 }], 2)).toThrow();
  });
  it("uses only permitted horizontal rotation", () => {
    const p = { ...profile, widthCm: 19, lengthCm: 9 };
    const b = { ...box, innerWidthCm: 10 };
    expect(() => plan([p], 1, [b])).toThrow();
    expect(plan([{ ...p, canRotate: true }], 1, [b]).parcels[0].packing?.placements[0].widthCm).toBe(9);
  });
  it("does not stack unless every product permits it", () => {
    const b = { ...box, innerWidthCm: 10, innerLengthCm: 10, innerHeightCm: 20, heightCm: 22 };
    expect(() => plan([profile], 2, [b])).toThrow();
    expect(plan([{ ...profile, canStack: true }], 2, [b]).parcels[0].packing?.placements.map(p => p.z)).toEqual([0, 10]);
  });
  it("rejects exclusive boxes, absent or mixed classifications, missing profiles and overweight", () => {
    for (const p of [{ ...profile, shipSeparately: true }, { ...profile, classificationId: undefined }, { ...profile, weightGrams: 9900 }]) expect(() => plan([p])).toThrow();
    expect(() => plan([profile, { ...profile, productId: "b", classificationId: "other" }])).toThrow();
    expect(() => buildSharedBoxPlan({ items: [{ productId: "missing", quantity: 1 }], profiles: [], boxes: [box], constraints })).toThrow();
  });
  it("is deterministic, selects the smallest fitting box and invalidates changed revisions", () => {
    const bigger = { ...box, id: "big", widthCm: 30, innerWidthCm: 28 };
    expect(plan([profile], 2, [bigger, box])).toEqual(plan());
    expect(plan([profile], 2, [{ ...box, revision: "r2" }]).fingerprint).not.toBe(plan().fingerprint);
    expect(plan([{ ...profile, revision: "r2" }]).fingerprint).not.toBe(plan().fingerprint);
  });
  it("every accepted plan stays inside the box with no overlaps", () => {
    for (let w = 3; w <= 11; w += 2) for (let l = 3; l <= 11; l += 2) {
      let result; try { result = plan([{ ...profile, widthCm: w, lengthCm: l, heightCm: 4, canStack: true }], 7); } catch { continue; }
      const placements = result.parcels[0].packing!.placements;
      for (const [i, a] of placements.entries()) {
        expect(a.x + a.widthCm <= box.innerWidthCm && a.y + a.lengthCm <= box.innerLengthCm && a.z + a.heightCm <= box.innerHeightCm).toBe(true);
        for (const b of placements.slice(i + 1)) expect(a.x >= b.x + b.widthCm || b.x >= a.x + a.widthCm || a.y >= b.y + b.lengthCm || b.y >= a.y + a.lengthCm || a.z >= b.z + b.heightCm || b.z >= a.z + a.heightCm).toBe(true);
      }
    }
  });
});
