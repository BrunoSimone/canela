import { provinceName, type ProvinceCode } from "../../checkout/domain/delivery";
import type { PlannedParcel, ShippingLine } from "./parcel-plan";

export const COURIER_QUOTE_TTL_MS = 10 * 60 * 1000;

export type ShippingDestination = { city: string; provinceCode: ProvinceCode; postalCode: string };
export type DispatchType = "carrier_dropoff" | "carrier_pickup";
export type CourierRate = {
  carrierId: number;
  carrierName: string;
  serviceCode: "standard_delivery";
  serviceName: string;
  dispatchType: DispatchType;
  amountCents: number;
  sellerAmountCents: number;
};
export type ShipmentQuoteInput = {
  destination: ShippingDestination;
  declaredValueCents: number;
  parcels: PlannedParcel[];
};
export interface ShipmentRateGateway {
  quoteShipment(input: ShipmentQuoteInput): Promise<CourierRate[]>;
}
export type CourierQuoteSnapshot = CourierRate & {
  version: 3;
  provider: "zipnova";
  accountMode: "operational" | "sandbox";
  contextFingerprint: string;
  destination: ShippingDestination;
  items: ShippingLine[];
  cartFingerprint: string;
  planFingerprint: string;
  parcels: PlannedParcel[];
  merchandiseCents: number;
  issuedAt: string;
  expiresAt: string;
};
export type IssuedCourierQuote = CourierQuoteSnapshot & { token: string };
export interface CourierQuoteIssuer {
  issue(snapshot: CourierQuoteSnapshot): IssuedCourierQuote;
  authenticate(token: string, now?: Date): CourierQuoteSnapshot;
}
export class InvalidCourierQuoteInputError extends Error {}
export class UnavailableCourierRateError extends Error {}
export class InvalidCourierRateError extends Error {}
export class CourierProviderUnavailableError extends Error {}
export class CourierQuoteMismatchError extends Error {}
export class CourierRateChangedError extends Error {}
export class ShippingRateLimitedError extends Error {}

export function normalizeShippingDestination(value: unknown): ShippingDestination {
  if (!value || typeof value !== "object") throw new InvalidCourierQuoteInputError();
  const d = value as Record<string, unknown>;
  if (typeof d.city !== "string" || typeof d.provinceCode !== "string" ||
      !provinceName(d.provinceCode) || typeof d.postalCode !== "string") {
    throw new InvalidCourierQuoteInputError();
  }
  const city = d.city.normalize("NFC").trim().replace(/\s+/g, " ");
  const postalCode = d.postalCode.trim();
  if (city.length < 2 || city.length > 100 || /[\p{Cc}\p{Cf}]/u.test(city) || !/^[1-9]\d{3}$/.test(postalCode)) {
    throw new InvalidCourierQuoteInputError();
  }
  return { city, provinceCode: d.provinceCode as ProvinceCode, postalCode };
}
export function sameDestination(a: ShippingDestination, b: ShippingDestination): boolean {
  return a.city.toLocaleLowerCase("es-AR") === b.city.toLocaleLowerCase("es-AR") &&
    a.provinceCode === b.provinceCode && a.postalCode === b.postalCode;
}
export function rateKey(rate: CourierRate): string {
  return `${rate.carrierId}:${rate.serviceCode}:${rate.dispatchType}`;
}
