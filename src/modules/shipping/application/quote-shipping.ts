import { createHash } from "node:crypto";
import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import { resolveCheckoutItems } from "../../checkout/application/resolve-checkout-items";
import type { CheckoutItem } from "../../checkout/domain/checkout";
import { COURIER_QUOTE_TTL_MS, CourierProviderUnavailableError, CourierQuoteMismatchError, CourierRateChangedError, InvalidCourierRateError, ShippingRateLimitedError, UnavailableCourierRateError, normalizeShippingDestination, rateKey, sameDestination, type CourierQuoteIssuer, type CourierRate, type ShipmentRateGateway, type ShippingDestination } from "../domain/courier-quote";
import { buildMarginParcels, marginPlanFingerprint, markQuoteMargin, type QuoteMarginPolicy, type QuoteMarginStatus } from "../domain/quote-margin";
import { ParcelLimitExceededError, type ParcelConstraints, type ParcelGroupingRule, type ShippingLine } from "../domain/parcel-plan";
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
  const rates = await deps.rates.quoteShipment({ destination, declaredValueCents: merchandiseCents, parcels: plan.parcels });
  if (!rates.length) throw new UnavailableCourierRateError();
  const padded = deps.marginPolicy ? buildMarginParcels(plan.parcels, deps.marginPolicy, deps.constraints) : null;
  let paddedRates: CourierRate[] = [];
  if (padded) {
    try {
      paddedRates = await deps.rates.quoteShipment({ destination, declaredValueCents: merchandiseCents, parcels: padded });
    } catch (error) {
      // The base is already a valid quote. An optional margin must not prevent checkout.
      if (!(error instanceof UnavailableCourierRateError || error instanceof CourierProviderUnavailableError ||
            error instanceof InvalidCourierRateError || error instanceof ShippingRateLimitedError)) throw error;
    }
  }
  const issuedAt = (deps.now ?? (() => new Date()))();
  const expiresAt = new Date(issuedAt.getTime() + COURIER_QUOTE_TTL_MS).toISOString();
  return {
    subtotalCents: merchandiseCents,
    items,
    options: rates.map(rate => {
      let parcels = plan.parcels;
      if (deps.marginPolicy) {
        const candidate = paddedRates.find(r => rateKey(r) === rateKey(rate));
        const status: QuoteMarginStatus = !padded ? "limits" : !candidate ? "unavailable" :
          candidate.amountCents === rate.amountCents && candidate.sellerAmountCents === rate.sellerAmountCents ? "applied" : "price_changed";
        parcels = markQuoteMargin(plan.parcels, status === "applied" ? padded! : plan.parcels, status);
      }
      return deps.issuer.issue({ ...rate, version: 3, provider: "zipnova", accountMode: deps.accountMode,
      contextFingerprint: deps.contextFingerprint, destination, items: plan.items, cartFingerprint,
      planFingerprint: marginPlanFingerprint(plan, deps.marginPolicy), parcels, merchandiseCents,
      issuedAt: issuedAt.toISOString(), expiresAt });
    }),
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
    let parcels = plan.parcels;
    if (this.deps.marginPolicy) {
      const status = snapshot.parcels[0].quoteMargin?.status;
      if (!status) throw new CourierQuoteMismatchError();
      const selected = status === "applied" ? buildMarginParcels(plan.parcels, this.deps.marginPolicy, this.deps.constraints) : plan.parcels;
      if (!selected) throw new CourierQuoteMismatchError();
      parcels = markQuoteMargin(plan.parcels, selected, status);
    }
    if (JSON.stringify(parcels) !== JSON.stringify(snapshot.parcels)) throw new CourierQuoteMismatchError();
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
