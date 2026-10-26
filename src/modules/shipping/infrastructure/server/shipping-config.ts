import { createHash } from "node:crypto";
import type { ParcelConstraints } from "../../domain/parcel-plan";
import type { ZipnovaConfig } from "../zipnova/client";
import { DEFAULT_QUOTE_MARGIN, validateMarginPolicy, type QuoteMarginPolicy } from "../../domain/quote-margin";

export type ShippingConfig = ZipnovaConfig & { accountMode: "operational" | "sandbox"; contextFingerprint: string; maxParcels: number; marginPolicy?: QuoteMarginPolicy };
// API input bounds, not a promise that a carrier accepts such a parcel.
// Carrier restrictions are applied by Zipnova and only selectable rates are offered.
export const ZIPNOVA_INPUT_CONSTRAINTS: ParcelConstraints = {
  maxUnits: 20, maxWeightGrams: 10000000, maxHeightCm: 5000, maxWidthCm: 5000, maxLengthCm: 5000,
};
export function readShippingConfig(env: Record<string, string | undefined> = process.env): ShippingConfig {
  const { ZIPNOVA_API_TOKEN: apiToken, ZIPNOVA_API_SECRET: apiSecret, ZIPNOVA_DISPATCH_TYPE: dispatchType, ZIPNOVA_ACCOUNT_MODE: accountMode } = env;
  const accountId = positiveId(env.ZIPNOVA_ACCOUNT_ID), originId = positiveId(env.ZIPNOVA_ORIGIN_ID);
  const maxParcels = positiveId(env.ZIPNOVA_MAX_PARCELS ?? "1");
  if (!apiToken || !apiSecret || !accountId || !originId ||
      (dispatchType !== "carrier_dropoff" && dispatchType !== "carrier_pickup") ||
      (accountMode !== "operational" && accountMode !== "sandbox") || !maxParcels || maxParcels > 20) throw new Error("Zipnova configuration is incomplete");
  const contextFingerprint = createHash("sha256").update(JSON.stringify({ provider: "zipnova", accountId, originId, dispatchType, accountMode, maxParcels })).digest("hex");
  return { apiToken, apiSecret, accountId, originId, dispatchType, accountMode, contextFingerprint, maxParcels, marginPolicy: readMarginPolicy(env) };
}
function readMarginPolicy(env: Record<string, string | undefined>): QuoteMarginPolicy | undefined {
  const integer = (value: string | undefined, fallback: number) => value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : NaN;
  const policy = {
    weightPercent: integer(env.SHIPPING_MARGIN_WEIGHT_PERCENT, DEFAULT_QUOTE_MARGIN.weightPercent),
    maxExtraWeightGrams: integer(env.SHIPPING_MARGIN_MAX_WEIGHT_GRAMS, DEFAULT_QUOTE_MARGIN.maxExtraWeightGrams),
    extraDimensionCm: integer(env.SHIPPING_MARGIN_DIMENSION_CM, DEFAULT_QUOTE_MARGIN.extraDimensionCm),
  };
  validateMarginPolicy(policy);
  return policy.weightPercent || policy.extraDimensionCm ? policy : undefined;
}
function positiveId(value: string | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
