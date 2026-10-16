import { describe, expect, it, vi } from "vitest";
import { beginCheckout } from "../../checkout/application/begin-checkout";
import { testDelivery } from "../../checkout/domain/delivery.test-fixture";
import { InvalidDeliveryError } from "../../checkout/domain/delivery";
import { CourierQuoteMismatchError, CourierRateChangedError, UnavailableCourierRateError } from "../domain/courier-quote";
import { ExpiredShippingQuoteError } from "../domain/shipping-quote";
import { dependencies, destination, items, now, profile, quoteFixture, rate } from "../testing/fixtures";
import { quoteShipping, ZipnovaCheckoutQuotes } from "./quote-shipping";

const contextItems = [{ productId: "piece", name: "Pieza", unitPriceCents: 1500000, quantity: 2 }];
describe("Zipnova shipping application", () => {
  it("rejects a revised shared box before reserving stock or creating a payment", async () => {
    const deps = { ...dependencies(), maxParcels: 1, boxes: { list: vi.fn() } };
    deps.catalog.findByIds.mockResolvedValue([{ id: "piece", sellable: true, profile: { ...profile, shipSeparately: false } }]);
    const box = { id: "box", revision: "r1", name: "Caja", innerHeightCm: 20, innerWidthCm: 40, innerLengthCm: 40, heightCm: 22, widthCm: 42, lengthCm: 42, tareWeightGrams: 200, maxWeightGrams: 10000 };
    deps.boxes.list.mockResolvedValue([box]);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options[0].parcels).toHaveLength(1);
    deps.boxes.list.mockResolvedValue([{ ...box, revision: "r2" }]);
    const repository = { reserve: vi.fn(), saveProviderOrder: vi.fn(), markProviderCreationUncertain: vi.fn(), releaseForDefinitiveProviderFailure: vi.fn() };
    const payments = { createOrder: vi.fn(), getOrder: vi.fn() };
    await expect(beginCheckout({ repository, payments, catalog: deps.products, quotes: new ZipnovaCheckoutQuotes(deps), signingSecret: "a".repeat(64), siteUrl: "https://canela.test" }, {
      idempotencyKey: "box-change", shippingQuoteToken: quoted.options[0].token, items,
      buyerEmail: "buyer@example.com", delivery: { ...testDelivery, ...destination, recipientDocument: "12345678" },
    })).rejects.toBeInstanceOf(CourierQuoteMismatchError);
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(payments.createOrder).not.toHaveBeenCalled();
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it("blocks multi-parcel carts under the single-parcel policy before requesting rates", async () => {
    const deps = { ...dependencies(), maxParcels: 1 };
    await expect(quoteShipping(deps, { items, destination })).rejects.toThrow();
    expect(deps.rates.quoteShipment).not.toHaveBeenCalled();
  });
  it.each(["document", "phone"])("requires recipient %s before reserving stock or creating payment", async missing => {
    const { deps, token } = await quoteFixture();
    const quotes = new ZipnovaCheckoutQuotes(deps);
    const verify = vi.spyOn(quotes, "verifyForCheckout");
    const repository = { reserve: vi.fn(), saveProviderOrder: vi.fn(), markProviderCreationUncertain: vi.fn(), releaseForDefinitiveProviderFailure: vi.fn() };
    const payments = { createOrder: vi.fn(), getOrder: vi.fn() };
    await expect(beginCheckout({ repository, payments, catalog: deps.products, quotes, signingSecret: "a".repeat(64), siteUrl: "https://canela.test" }, {
      idempotencyKey: "test", shippingQuoteToken: token, items, buyerEmail: "buyer@example.com",
      delivery: { ...testDelivery, ...destination, recipientDocument: missing === "document" ? null : "12345678", phone: missing === "phone" ? null : testDelivery.phone },
    })).rejects.toBeInstanceOf(InvalidDeliveryError);
    expect(verify).not.toHaveBeenCalled();
    expect(repository.reserve).not.toHaveBeenCalled();
    expect(payments.createOrder).not.toHaveBeenCalled();
  });
  it("quotes the complete package plan once, using authoritative prices as declared value", async () => {
    const { deps, quoted } = await quoteFixture();
    expect(deps.rates.quoteShipment).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ declaredValueCents: 3000000, destination, parcels: expect.any(Array) }));
    expect(deps.rates.quoteShipment.mock.calls[0][0].parcels).toHaveLength(2);
    expect(quoted.options[0].amountCents).toBe(1425300);
    expect(quoted.options[0].expiresAt).toBe("2026-10-13T17:10:00.000Z");
    expect(quoted.subtotalCents).toBe(3000000);
  });
  it.each([null, { ...profile, classificationId: undefined }])("blocks missing logistics data before calling the carrier", async p => {
    const deps = dependencies();
    deps.catalog.findByIds.mockResolvedValue([{ id: "piece", sellable: true, profile: p }]);
    await expect(quoteShipping(deps, { items, destination })).rejects.toThrow();
    expect(deps.rates.quoteShipment).not.toHaveBeenCalled();
  });
  it("preserves the signed snapshot when a fresh quote matches", async () => {
    const { deps, token, snapshot } = await quoteFixture();
    const verifier = new ZipnovaCheckoutQuotes(deps);
    const quote = await verifier.verifyForCheckout(verifier.verify(token), { items: contextItems, destination });
    expect(quote).toMatchObject({ source: "zipnova", snapshot });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(2);
  });
  it.each(["city", "provinceCode", "postalCode", "price", "quantity", "profile", "classification", "origin"])("rejects changed %s before recotizing", async kind => {
    const { deps, token } = await quoteFixture();
    const context = { items: structuredClone(contextItems), destination: { ...destination } };
    if (kind === "city") context.destination.city = "Belgrano";
    if (kind === "provinceCode") context.destination.provinceCode = "B";
    if (kind === "postalCode") context.destination.postalCode = "1426";
    if (kind === "price") context.items[0].unitPriceCents++;
    if (kind === "quantity") context.items[0].quantity++;
    if (kind === "profile" || kind === "classification") deps.catalog.findByIds.mockResolvedValue([{ id: "piece", sellable: true, profile: { ...profile, ...(kind === "profile" ? { weightGrams: 2000 } : { classificationId: "fragile" }) } }]);
    if (kind === "origin") deps.contextFingerprint = "d".repeat(64);
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(token), context)).rejects.toBeInstanceOf(CourierQuoteMismatchError);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it.each(["amountCents", "sellerAmountCents"] as const)("requires confirmation after %s changes", async key => {
    const { deps, token } = await quoteFixture();
    deps.rates.quoteShipment.mockResolvedValue([{ ...rate, [key]: rate[key] + 1 }]);
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierRateChangedError);
  });
  it("rejects a selected carrier disappearing", async () => {
    const { deps, token } = await quoteFixture(); deps.rates.quoteShipment.mockResolvedValue([]);
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(token), { items: contextItems, destination })).rejects.toBeInstanceOf(UnavailableCourierRateError);
  });
  it("expires quotes that time out during revalidation", async () => {
    const { deps, token } = await quoteFixture();
    deps.now = vi.fn().mockReturnValueOnce(now).mockReturnValue(new Date("2026-10-13T17:10:00Z"));
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(token), { items: contextItems, destination })).rejects.toBeInstanceOf(ExpiredShippingQuoteError);
  });
  it("never reserves stock or invokes payments if revalidation changes the price", async () => {
    const { deps, token } = await quoteFixture();
    deps.rates.quoteShipment.mockResolvedValue([{ ...rate, amountCents: 1 }]);
    const repository = { reserve: vi.fn(), saveProviderOrder: vi.fn(), markProviderCreationUncertain: vi.fn(), releaseForDefinitiveProviderFailure: vi.fn() };
    const payments = { createOrder: vi.fn(), getOrder: vi.fn() };
    await expect(beginCheckout({ repository, payments, catalog: deps.products, quotes: new ZipnovaCheckoutQuotes(deps), signingSecret: "a".repeat(64), siteUrl: "https://canela.test" }, {
      idempotencyKey: "test", shippingQuoteToken: token, items, buyerEmail: "buyer@example.com", delivery: { ...testDelivery, ...destination, recipientDocument: "12345678" },
    })).rejects.toBeInstanceOf(CourierRateChangedError);
    expect(repository.reserve).not.toHaveBeenCalled(); expect(payments.createOrder).not.toHaveBeenCalled();
  });
});
