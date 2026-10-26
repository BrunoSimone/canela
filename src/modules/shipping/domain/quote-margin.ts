import { createHash } from "node:crypto";
import type { ParcelConstraints, ParcelDimensions, ParcelPlan, PlannedParcel } from "./parcel-plan";

export type QuoteMarginPolicy = { weightPercent: number; maxExtraWeightGrams: number; extraDimensionCm: number };
// Non-applied states are retained only to read historical paid orders.
export type QuoteMarginStatus = "applied" | "price_changed" | "unavailable" | "limits";
export type QuoteMargin = { status: QuoteMarginStatus; base: ParcelDimensions };
export const DEFAULT_QUOTE_MARGIN: QuoteMarginPolicy = { weightPercent: 5, maxExtraWeightGrams: 200, extraDimensionCm: 1 };

export function validateMarginPolicy(policy: QuoteMarginPolicy): void {
  if (![policy.weightPercent, policy.maxExtraWeightGrams, policy.extraDimensionCm].every(n => Number.isSafeInteger(n) && n >= 0) ||
      policy.weightPercent > 20 || policy.maxExtraWeightGrams > 1000 || policy.extraDimensionCm > 5 ||
      (policy.weightPercent === 0) !== (policy.maxExtraWeightGrams === 0)) throw new Error("Invalid shipping margin configuration");
}

export function buildMarginParcels(parcels: PlannedParcel[], policy: QuoteMarginPolicy, limits: ParcelConstraints): PlannedParcel[] | null {
  validateMarginPolicy(policy);
  const padded = parcels.map(p => ({ ...p,
    weightGrams: p.weightGrams + Math.min(Math.ceil(p.weightGrams * policy.weightPercent / 100), policy.maxExtraWeightGrams),
    heightCm: p.heightCm + policy.extraDimensionCm, widthCm: p.widthCm + policy.extraDimensionCm, lengthCm: p.lengthCm + policy.extraDimensionCm,
  }));
  if (padded.some(p => !Number.isSafeInteger(p.weightGrams) ||
    p.weightGrams > Math.min(limits.maxWeightGrams, p.packing?.maxWeightGrams ?? limits.maxWeightGrams) ||
    p.heightCm > limits.maxHeightCm || p.widthCm > limits.maxWidthCm || p.lengthCm > limits.maxLengthCm ||
    (limits.maxCombinedCm !== undefined && p.heightCm + p.widthCm + p.lengthCm > limits.maxCombinedCm))) return null;
  return padded;
}

/** Only unpaid checkout plans depend on margin policy; the fulfillment account context does not. */
export function marginPlanFingerprint(plan: ParcelPlan, policy?: QuoteMarginPolicy): string {
  return policy ? createHash("sha256").update(JSON.stringify({ version: "quote-margin-v2-required", base: plan.fingerprint,
    weightPercent: policy.weightPercent, maxExtraWeightGrams: policy.maxExtraWeightGrams, extraDimensionCm: policy.extraDimensionCm })).digest("hex") : plan.fingerprint;
}

export function markQuoteMargin(base: PlannedParcel[], selected: PlannedParcel[]): PlannedParcel[] {
  return selected.map((p, i) => {
    const { weightGrams, heightCm, widthCm, lengthCm } = base[i];
    return { ...p, quoteMargin: { status: "applied", base: { weightGrams, heightCm, widthCm, lengthCm } } };
  });
}

export function validQuoteMargin(parcel: PlannedParcel): boolean {
  if (parcel.quoteMargin === undefined) return true;
  const margin = parcel.quoteMargin;
  if (!margin || !["applied", "price_changed", "unavailable", "limits"].includes(margin.status) || !margin.base) return false;
  return (["weightGrams", "heightCm", "widthCm", "lengthCm"] as const).every(key => {
    const value = margin.base[key];
    return Number.isSafeInteger(value) && value > 0 && (margin.status === "applied" ? value <= parcel[key] : value === parcel[key]);
  });
}
