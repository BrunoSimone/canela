import { createHash } from "node:crypto";
import { InvalidParcelPlanError, MissingShippingProfileError, normalizeShippingLines, ParcelLimitExceededError, type BuildParcelPlanInput, type ParcelPlan, type ShippingProfile } from "./parcel-plan";

export type ShippingBox = {
  id: string; revision: string; name: string;
  innerHeightCm: number; innerWidthCm: number; innerLengthCm: number;
  heightCm: number; widthCm: number; lengthCm: number;
  tareWeightGrams: number; maxWeightGrams: number;
};
export type Placement = { productId: string; unit: number; x: number; y: number; z: number; widthCm: number; lengthCm: number; heightCm: number };
export type PackingInstructions = { boxId: string; boxRevision: string; boxName: string; placements: Placement[] };
type Space = { x: number; y: number; z: number; w: number; l: number; h: number };

export function validateBox(box: ShippingBox): void {
  if (!box.id || !box.revision || !box.name ||
    ![box.innerHeightCm, box.innerWidthCm, box.innerLengthCm, box.heightCm, box.widthCm, box.lengthCm, box.tareWeightGrams, box.maxWeightGrams].every(n => Number.isSafeInteger(n) && n > 0 && n <= 10000000) ||
    box.innerHeightCm > box.heightCm || box.innerWidthCm > box.widthCm || box.innerLengthCm > box.lengthCm || box.tareWeightGrams >= box.maxWeightGrams) {
    throw new InvalidParcelPlanError("Invalid shipping box");
  }
}

/** Conservative guillotine packing: spaces never overlap; rotation is horizontal only. */
export function buildSharedBoxPlan(input: Omit<BuildParcelPlanInput, "groupingRules"> & { boxes: ShippingBox[] }): ParcelPlan {
  const items = normalizeShippingLines(input.items, input.constraints.maxUnits);
  const profiles = new Map(input.profiles.map(p => [p.productId, p]));
  if (profiles.size !== input.profiles.length) throw new InvalidParcelPlanError("Duplicate shipping profile");
  const missing = items.filter(i => !profiles.has(i.productId)).map(i => i.productId);
  if (missing.length) throw new MissingShippingProfileError(missing);
  const selected = items.map(i => profiles.get(i.productId)!);
  for (const p of selected) {
    if (![p.weightGrams, p.heightCm, p.widthCm, p.lengthCm, p.version].every(n => Number.isSafeInteger(n) && n > 0) || typeof p.shipSeparately !== "boolean") throw new InvalidParcelPlanError("Invalid protected unit");
  }
  const classifications = new Set(selected.map(p => p.classificationId));
  // Conservative application rule: a General + glass box still contains glass.
  // Other mixed classifications require a separate, explicit packing rule.
  const glassAndGeneral = classifications.has("6") && [...classifications].every(id => id === "1" || id === "6");
  if (selected.some(p => !p.classificationId) || (classifications.size !== 1 && !glassAndGeneral)) throw new MissingShippingProfileError(items.map(i => i.productId));
  const classificationId = glassAndGeneral ? "6" : selected[0].classificationId;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalUnits > 1 && selected.some(p => p.shipSeparately)) throw new ParcelLimitExceededError();
  const units: { profile: ShippingProfile; unit: number }[] = items.flatMap(i => Array.from({ length: i.quantity }, (_, unit) => ({ profile: profiles.get(i.productId)!, unit: unit + 1 })));
  units.sort((a, b) => b.profile.widthCm * b.profile.lengthCm * b.profile.heightCm - a.profile.widthCm * a.profile.lengthCm * a.profile.heightCm || a.profile.productId.localeCompare(b.profile.productId) || a.unit - b.unit);
  const stack = selected.every(p => p.canStack === true);
  const productWeight = items.reduce((sum, i) => sum + profiles.get(i.productId)!.weightGrams * i.quantity, 0);
  if (new Set(input.boxes.map(b => b.id)).size !== input.boxes.length) throw new InvalidParcelPlanError("Duplicate box");
  input.boxes.forEach(validateBox);
  const boxes = [...input.boxes].sort((a, b) => a.heightCm * a.widthCm * a.lengthCm - b.heightCm * b.widthCm * b.lengthCm || a.tareWeightGrams - b.tareWeightGrams || a.id.localeCompare(b.id));
  for (const box of boxes) {
    const weightGrams = productWeight + box.tareWeightGrams;
    const c = input.constraints;
    if (!Number.isSafeInteger(weightGrams) || weightGrams > Math.min(box.maxWeightGrams, c.maxWeightGrams) || box.heightCm > c.maxHeightCm || box.widthCm > c.maxWidthCm || box.lengthCm > c.maxLengthCm || (c.maxCombinedCm !== undefined && box.heightCm + box.widthCm + box.lengthCm > c.maxCombinedCm)) continue;
    let spaces: Space[] = [{ x: 0, y: 0, z: 0, w: box.innerWidthCm, l: box.innerLengthCm, h: box.innerHeightCm }];
    const placements: Placement[] = [];
    for (const { profile: p, unit } of units) {
      spaces.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
      const orientations = [[p.widthCm, p.lengthCm], ...(p.canRotate ? [[p.lengthCm, p.widthCm]] : [])];
      let placed = false;
      for (let index = 0; index < spaces.length && !placed; index++) {
        const s = spaces[index];
        for (const [w, l] of orientations) {
          if (w > s.w || l > s.l || p.heightCm > s.h) continue;
          placements.push({ productId: p.productId, unit, x: s.x, y: s.y, z: s.z, widthCm: w, lengthCm: l, heightCm: p.heightCm });
          spaces.splice(index, 1);
          spaces.push({ ...s, x: s.x + w, w: s.w - w }, { ...s, y: s.y + l, w, l: s.l - l });
          if (stack) spaces.push({ x: s.x, y: s.y, z: s.z + p.heightCm, w, l, h: s.h - p.heightCm });
          spaces = spaces.filter(v => v.w > 0 && v.l > 0 && v.h > 0);
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
    if (placements.length !== totalUnits) continue;
    const packing: PackingInstructions = { boxId: box.id, boxRevision: box.revision, boxName: box.name, placements };
    const parcels = [{ weightGrams, heightCm: box.heightCm, widthCm: box.widthCm, lengthCm: box.lengthCm, items, groupingRule: null, classificationId, packing }];
    const fingerprint = createHash("sha256").update(JSON.stringify({ algorithm: "shared-box-v2", items, profiles: selected, box, parcels })).digest("hex");
    return { items, parcels, fingerprint };
  }
  throw new ParcelLimitExceededError();
}
