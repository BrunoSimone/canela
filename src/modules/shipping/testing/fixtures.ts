import { vi } from "vitest";
import type { QuoteShippingDependencies } from "../application/quote-shipping";
import { quoteShipping } from "../application/quote-shipping";
import type { CourierRate, ShippingDestination } from "../domain/courier-quote";
import { SignedCourierQuoteService } from "../infrastructure/signed-courier-quote";
import { ZIPNOVA_INPUT_CONSTRAINTS } from "../infrastructure/server/shipping-config";

export const now = new Date("2026-10-13T17:00:00Z");
export const destination: ShippingDestination = { city: "Palermo", provinceCode: "C", postalCode: "1425" };
export const items = [{ productId: "piece", quantity: 2 }];
export const product = { id: "piece", name: "Pieza", priceArs: 15000, sellable: true };
export const profile = { productId: "piece", version: 1, weightGrams: 1000, heightCm: 10, widthCm: 20, lengthCm: 20, shipSeparately: true, classificationId: "1" };
export const rate: CourierRate = { carrierId: 208, carrierName: "OCA", serviceCode: "standard_delivery", serviceName: "Entrega a domicilio", dispatchType: "carrier_dropoff", amountCents: 1425300, sellerAmountCents: 1425300 };
export function dependencies() {
  return {
    catalog: { findByIds: vi.fn().mockResolvedValue([{ id: "piece", sellable: true, profile }]) },
    products: { findByIds: vi.fn().mockResolvedValue([product]) },
    rates: { quoteShipment: vi.fn().mockResolvedValue([rate]) },
    issuer: new SignedCourierQuoteService("test-only-secret-".repeat(4)),
    constraints: ZIPNOVA_INPUT_CONSTRAINTS, groupingRules: [],
    accountMode: "sandbox" as const, contextFingerprint: "c".repeat(64), now: () => now,
  } satisfies QuoteShippingDependencies;
}
export async function quoteFixture() {
  const deps = dependencies();
  const quoted = await quoteShipping(deps, { items, destination });
  const { token, ...snapshot } = quoted.options[0];
  return { deps, quoted, token, snapshot };
}
