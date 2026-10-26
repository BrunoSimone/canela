import { describe, expect, it, vi } from "vitest";
import { quoteShipping, ZipnovaCheckoutQuotes } from "./quote-shipping";
import { dependencies, destination, items, profile, rate } from "../testing/fixtures";
import { DEFAULT_QUOTE_MARGIN } from "../domain/quote-margin";
import { CourierProviderUnavailableError, CourierQuoteMismatchError, CourierRateChangedError, InvalidCourierRateError, ShippingRateLimitedError, UnavailableCourierRateError } from "../domain/courier-quote";

const contextItems = [{ productId: "piece", name: "Pieza", unitPriceCents: 1500000, quantity: 2 }];
function setup() {
  const deps = { ...dependencies(), marginPolicy: { ...DEFAULT_QUOTE_MARGIN }, maxParcels: 1, boxes: { list: vi.fn().mockResolvedValue([{ id: "box", revision: "r1", name: "Caja", innerHeightCm: 20, innerWidthCm: 40, innerLengthCm: 40, heightCm: 22, widthCm: 42, lengthCm: 42, tareWeightGrams: 200, maxWeightGrams: 10000 }]) } };
  deps.catalog.findByIds.mockResolvedValue([{ id: "piece", sellable: true, profile: { ...profile, shipSeparately: false } }]);
  return deps;
}
describe("MAR-02/03: margin without increasing the selected service cost", () => {
  it("applies margin to the shared box only when buyer and seller prices stay equal", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(2);
    const parcel = quoted.options[0].parcels[0];
    expect(parcel).toMatchObject({ weightGrams: 2310, heightCm: 23, widthCm: 43, lengthCm: 43, quoteMargin: { status: "applied", base: { weightGrams: 2200, heightCm: 22, widthCm: 42, lengthCm: 42 } } });
    expect(quoted.options[0].amountCents).toBe(rate.amountCents);
    const verifier = new ZipnovaCheckoutQuotes(deps), signed = verifier.verify(quoted.options[0].token);
    expect(await verifier.verifyForCheckout(signed, { items: contextItems, destination })).toEqual(signed);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(3);
    expect(deps.rates.quoteShipment.mock.calls[2][0].parcels).toEqual(quoted.options[0].parcels);
  });
  it.each(["amountCents", "sellerAmountCents"] as const)("uses the base estimate when %s changes, even by one cent", async field => {
    const deps = setup();
    deps.rates.quoteShipment.mockResolvedValueOnce([rate]).mockResolvedValueOnce([{ ...rate, [field]: rate[field] + 1 }]);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options[0].parcels[0]).toMatchObject({ weightGrams: 2200, heightCm: 22, quoteMargin: { status: "price_changed" } });
    const verifier = new ZipnovaCheckoutQuotes(deps), signed = verifier.verify(quoted.options[0].token);
    await expect(verifier.verifyForCheckout(signed, { items: contextItems, destination })).resolves.toEqual(signed);
    expect(deps.rates.quoteShipment.mock.calls[2][0].parcels[0].weightGrams).toBe(2200);
  });
  it("matches each service independently, preserves base prices and never adds margin-only services", async () => {
    const deps = setup(), other = { ...rate, carrierId: 2, carrierName: "Otro", amountCents: 2000000, sellerAmountCents: 1900000 };
    deps.rates.quoteShipment.mockResolvedValueOnce([rate, other]).mockResolvedValueOnce([{ ...other, sellerAmountCents: 1900001 }, rate, { ...rate, carrierId: 3 }]);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options.map(q => [q.carrierId, q.parcels[0].quoteMargin?.status])).toEqual([[208, "applied"], [2, "price_changed"]]);
  });
  it.each([new UnavailableCourierRateError(), new CourierProviderUnavailableError(), new InvalidCourierRateError(), new ShippingRateLimitedError()])("keeps the base if only the extra quote fails: %s", async error => {
    const deps = setup(); deps.rates.quoteShipment.mockResolvedValueOnce([rate]).mockRejectedValueOnce(error);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options[0].parcels[0]).toMatchObject({ weightGrams: 2200, quoteMargin: { status: "unavailable" } });
  });
  it("does not mask base errors or unexpected errors", async () => {
    const deps = setup(); deps.rates.quoteShipment.mockRejectedValueOnce(new CourierProviderUnavailableError());
    await expect(quoteShipping(deps, { items, destination })).rejects.toBeInstanceOf(CourierProviderUnavailableError);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
    deps.rates.quoteShipment.mockResolvedValueOnce([rate]).mockRejectedValueOnce(new Error("unexpected"));
    await expect(quoteShipping(deps, { items, destination })).rejects.toThrow("unexpected");
  });
  it("uses the base when its service disappears from the margin quote", async () => {
    const deps = setup(); deps.rates.quoteShipment.mockResolvedValueOnce([rate]).mockResolvedValueOnce([]);
    expect((await quoteShipping(deps, { items, destination })).options[0].parcels[0].quoteMargin?.status).toBe("unavailable");
  });
  it("does not request an invalid padded box", async () => {
    const deps = { ...setup(), constraints: { ...setup().constraints, maxWeightGrams: 2200 } };
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options[0].parcels[0].quoteMargin?.status).toBe("limits");
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it("invalidates unpaid quotes after a policy change without another API call", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    deps.marginPolicy.weightPercent = 6;
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(quoted.options[0].token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierQuoteMismatchError);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(2);
  });
  it("rejects a later price increase for padded dimensions", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    deps.rates.quoteShipment.mockResolvedValue([{ ...rate, sellerAmountCents: rate.sellerAmountCents + 1 }]);
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(quoted.options[0].token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierRateChangedError);
  });
  it("makes just the base call with margin disabled", async () => {
    const deps = { ...setup(), marginPolicy: undefined };
    const quoted = await quoteShipping(deps, { items, destination });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
    expect(quoted.options[0].parcels[0].quoteMargin).toBeUndefined();
  });
});
