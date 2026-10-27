import { isDeepStrictEqual } from "node:util";
import { createHash } from "node:crypto";
import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import { resolveCheckoutItems } from "../../checkout/application/resolve-checkout-items";
import type { CheckoutItem } from "../../checkout/domain/checkout";
import { COURIER_QUOTE_TTL_MS, CourierQuoteMismatchError, CourierRateChangedError, InvalidCourierRateError, UnavailableCourierRateError, normalizeShippingDestination, rateKey, sameDestination, type CourierQuoteIssuer, type ShipmentRateGateway, type ShippingDestination } from "../domain/courier-quote";
import { buildMarginParcels, marginPlanFingerprint, markQuoteMargin, type QuoteMarginPolicy } from "../domain/quote-margin";
import { ParcelLimitExceededError, type ParcelConstraints, type ParcelGroupingRule, type PlannedParcel, type ShippingLine } from "../domain/parcel-plan";
import { ExpiredShippingQuoteError, InvalidShippingQuoteError, type ShippingQuote, type ShippingQuoteVerifier } from "../domain/shipping-quote";
import { planShippingParcels, UnshippableProductError, type ShippingProfileCatalog } from "./plan-shipping-parcels";

export type QuoteShippingDependencies = {
  catalog: ShippingProfileCatalog;
  products: ProductCatalog;
  groupingRules: ParcelGroupingRule[];
  boxes?: { list(): Promise<import("../domain/shared-box-plan").ShippingBox[]> };
  constraints: ParcelConstraints;
  rates: ShipmentRateGateway;
  issuer: CourierQuoteIssuer;
  accountMode: "operational" | "sandbox";
  contextFingerprint: string;
  maxParcels?: number;
  marginPolicy?: QuoteMarginPolicy;
  now?: () => Date;
};
export type QuoteShippingInput = { destination: ShippingDestination; items: ShippingLine[] };

export async function quoteShipping(deps: QuoteShippingDependencies, input: QuoteShippingInput) {
  const destination = normalizeShippingDestination(input.destination);
  const items = await resolveCheckoutItems(deps.products, input.items);
  const { plan, merchandiseCents, cartFingerprint } = await prepare(deps, items);
  const parcels = quoteParcels(deps, plan.parcels);
  const rates = await deps.rates.quoteShipment({ destination, declaredValueCents: merchandiseCents, parcels });
  if (!rates.length) throw new UnavailableCourierRateError();
  const issuedAt = (deps.now ?? (() => new Date()))();
  const expiresAt = new Date(issuedAt.getTime() + COURIER_QUOTE_TTL_MS).toISOString();
  return {
    subtotalCents: merchandiseCents,
    items,
    options: rates.map(rate => deps.issuer.issue({ ...rate, version: 3, provider: "zipnova", accountMode: deps.accountMode,
      contextFingerprint: deps.contextFingerprint, destination, items: plan.items, cartFingerprint,
      planFingerprint: marginPlanFingerprint(plan, deps.marginPolicy), parcels, merchandiseCents,
      issuedAt: issuedAt.toISOString(), expiresAt })),
  };
}

export class ZipnovaCheckoutQuotes implements ShippingQuoteVerifier {
  constructor(private readonly deps: QuoteShippingDependencies) {}
  verify(token: string): ShippingQuote {
    const snapshot = this.deps.issuer.authenticate(token, this.now());
    return { source: "zipnova", amountCents: snapshot.amountCents, expiresAt: new Date(snapshot.expiresAt), snapshot };
  }
  async verifyForCheckout(quote: ShippingQuote, context: { items: CheckoutItem[]; destination: ShippingDestination }): Promise<ShippingQuote> {
    if (quote.source !== "zipnova") throw new InvalidShippingQuoteError();
    const snapshot = quote.snapshot;
    const destination = normalizeShippingDestination(context.destination);
    if (snapshot.contextFingerprint !== this.deps.contextFingerprint || snapshot.accountMode !== this.deps.accountMode ||
        !sameDestination(snapshot.destination, destination)) throw new CourierQuoteMismatchError();
    const { plan, merchandiseCents, cartFingerprint } = await prepare(this.deps, context.items);
    if (snapshot.planFingerprint !== marginPlanFingerprint(plan, this.deps.marginPolicy) || snapshot.cartFingerprint !== cartFingerprint ||
        snapshot.merchandiseCents !== merchandiseCents) throw new CourierQuoteMismatchError();
    const parcels = quoteParcels(this.deps, plan.parcels);
    if (!isDeepStrictEqual(parcels, snapshot.parcels)) throw new CourierQuoteMismatchError();
    const rates = await this.deps.rates.quoteShipment({ destination, declaredValueCents: merchandiseCents, parcels });
    const rate = rates.find(r => rateKey(r) === rateKey(snapshot));
    if (!rate) throw new UnavailableCourierRateError();
    if (rate.amountCents !== snapshot.amountCents || rate.sellerAmountCents !== snapshot.sellerAmountCents) throw new CourierRateChangedError();
    // Recheck after network latency. Preserve the original snapshot for idempotent retries.
    if (new Date(snapshot.expiresAt).getTime() <= this.now().getTime()) {
      throw new ExpiredShippingQuoteError();
    }
    return quote;
  }
  private now(): Date { return (this.deps.now ?? (() => new Date()))(); }
}

function quoteParcels(deps: QuoteShippingDependencies, base: PlannedParcel[]): PlannedParcel[] {
  if (!deps.marginPolicy) return base;
  const padded = buildMarginParcels(base, deps.marginPolicy, deps.constraints);
  if (!padded) throw new ParcelLimitExceededError();
  return markQuoteMargin(base, padded);
}

async function prepare(deps: QuoteShippingDependencies, items: CheckoutItem[]) {
  const plan = await planShippingParcels(deps, items.map(({ productId, quantity }) => ({ productId, quantity })));
  if (plan.parcels.length > (deps.maxParcels ?? 20)) throw new ParcelLimitExceededError();
  if (plan.parcels.some(p => p.weightGrams < 10)) throw new ParcelLimitExceededError();
  if (plan.parcels.some(p => !p.classificationId)) throw new UnshippableProductError(plan.items.map(i => i.productId));
  const merchandiseCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  if (!Number.isSafeInteger(merchandiseCents) || merchandiseCents < 0) throw new InvalidCourierRateError();
  const cartFingerprint = createHash("sha256").update(JSON.stringify([...items].sort((a,b) => a.productId.localeCompare(b.productId)))).digest("hex");
  return { plan, merchandiseCents, cartFingerprint };
}
