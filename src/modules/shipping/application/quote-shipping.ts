import { checkoutExpiresAt } from "../../checkout/domain/checkout-expiration";
import {
  InsufficientCourierRateValidityError,
  InvalidCourierQuoteInputError,
  InvalidCourierRateError,
  UnavailableCourierRateError,
  type CourierQuoteIssuer,
  type IssuedCourierQuote,
  type ParcelRateGateway,
} from "../domain/courier-quote";
import type {
  ParcelConstraints,
  ParcelGroupingRule,
  ShippingLine,
} from "../domain/parcel-plan";
import {
  planShippingParcels,
  type ShippingProfileCatalog,
} from "./plan-shipping-parcels";

type QuoteShippingDependencies = {
  catalog: ShippingProfileCatalog;
  groupingRules: ParcelGroupingRule[];
  constraints: ParcelConstraints;
  rates: ParcelRateGateway;
  issuer: CourierQuoteIssuer;
  environment: "qa" | "production";
  originPostalCode: string;
  serviceCode: string;
  now?: () => Date;
};

export async function quoteShipping(
  dependencies: QuoteShippingDependencies,
  input: { destinationPostalCode: string; items: ShippingLine[] },
): Promise<IssuedCourierQuote> {
  const originPostalCode = postalCode(dependencies.originPostalCode);
  const destinationPostalCode = postalCode(input.destinationPostalCode);
  const serviceCode = dependencies.serviceCode;
  if (!serviceCode?.trim()) {
    throw new InvalidCourierQuoteInputError("A confirmed courier service is required");
  }
  const plan = await planShippingParcels(dependencies, input.items);
  let amountCents = 0;
  let expiresAt = Number.POSITIVE_INFINITY;
  let serviceName: string | null = null;

  for (const parcel of plan.parcels) {
    const result = await dependencies.rates.quoteParcel({
      deliveryType: "home",
      originPostalCode,
      destinationPostalCode,
      parcel,
    });
    if (
      !result || !(result.validTo instanceof Date) ||
      !Number.isFinite(result.validTo.getTime()) ||
      !Array.isArray(result.rates)
    ) {
      throw new InvalidCourierRateError();
    }
    const matching = result.rates.filter((rate) =>
      rate?.deliveryType === "home" && rate.serviceCode === serviceCode);
    if (matching.length === 0) {
      throw new UnavailableCourierRateError();
    }
    if (matching.length !== 1) {
      throw new InvalidCourierRateError();
    }
    const rate = matching[0];
    if (
      typeof rate.serviceName !== "string" ||
      !rate.serviceName.trim() ||
      !Number.isSafeInteger(rate.amountCents) ||
      rate.amountCents < 0 ||
      (serviceName !== null && serviceName !== rate.serviceName)
    ) {
      throw new InvalidCourierRateError();
    }
    serviceName = rate.serviceName;
    amountCents += rate.amountCents;
    if (!Number.isSafeInteger(amountCents)) {
      throw new InvalidCourierRateError();
    }
    expiresAt = Math.min(expiresAt, result.validTo.getTime());
  }

  const now = (dependencies.now ?? (() => new Date()))();
  if (!Number.isFinite(now.getTime())) {
    throw new InvalidCourierQuoteInputError("Current time is invalid");
  }
  if (expiresAt < checkoutExpiresAt(now).getTime()) {
    throw new InsufficientCourierRateValidityError();
  }
  if (serviceName === null) {
    throw new InvalidCourierRateError();
  }

  return dependencies.issuer.issue({
    provider: "correo_argentino",
    environment: dependencies.environment,
    deliveryType: "home",
    originPostalCode,
    destinationPostalCode,
    items: plan.items,
    planFingerprint: plan.fingerprint,
    parcelCount: plan.parcels.length,
    serviceCode,
    serviceName,
    amountCents,
    expiresAt: new Date(expiresAt),
  });
}

function postalCode(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 16) {
    throw new InvalidCourierQuoteInputError("Postal code is required");
  }
  return value.trim();
}
