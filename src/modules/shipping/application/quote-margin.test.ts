import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { quoteShipping, ZipnovaCheckoutQuotes } from "./quote-shipping";
import { planShippingParcels } from "./plan-shipping-parcels";
import { dependencies, destination, items, profile, rate } from "../testing/fixtures";
import { DEFAULT_QUOTE_MARGIN } from "../domain/quote-margin";
import { ParcelLimitExceededError } from "../domain/parcel-plan";
import { CourierProviderUnavailableError, CourierQuoteMismatchError, CourierRateChangedError, InvalidCourierRateError, ShippingRateLimitedError, UnavailableCourierRateError } from "../domain/courier-quote";

const contextItems = [{ productId: "piece", name: "Pieza", unitPriceCents: 1500000, quantity: 2 }];
function setup() {
  const deps = { ...dependencies(), marginPolicy: { ...DEFAULT_QUOTE_MARGIN }, maxParcels: 1, boxes: { list: vi.fn().mockResolvedValue([{ id: "box", revision: "r1", name: "Caja", innerHeightCm: 20, innerWidthCm: 40, innerLengthCm: 40, heightCm: 22, widthCm: 42, lengthCm: 42, tareWeightGrams: 200, maxWeightGrams: 10000 }]) } };
  deps.catalog.findByIds.mockResolvedValue([{ id: "piece", sellable: true, profile: { ...profile, shipSeparately: false } }]);
  return deps;
}
describe("MAR-02/03: always quote the package including its margin", () => {
  it("quotes the padded shared box once and revalidates those same dimensions", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
    expect(quoted.options[0].parcels[0]).toMatchObject({ weightGrams: 2310, heightCm: 23, widthCm: 43, lengthCm: 43, quoteMargin: { status: "applied", base: { weightGrams: 2200, heightCm: 22, widthCm: 42, lengthCm: 42 } } });
    expect(deps.rates.quoteShipment.mock.calls[0][0].parcels).toEqual(quoted.options[0].parcels);
    const verifier = new ZipnovaCheckoutQuotes(deps), signed = verifier.verify(quoted.options[0].token);
    expect(await verifier.verifyForCheckout(signed, { items: contextItems, destination })).toEqual(signed);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(2);
    expect(deps.rates.quoteShipment.mock.calls[1][0].parcels).toEqual(quoted.options[0].parcels);
  });
  it("keeps margin and the resulting tariff even when it crosses a price band", async () => {
    const deps = setup();
    deps.rates.quoteShipment.mockImplementation(async ({ parcels }) => [{ ...rate, amountCents: parcels[0].weightGrams > 2200 ? 1784500 : 1436300, sellerAmountCents: parcels[0].weightGrams > 2200 ? 1784500 : 1436300 }]);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options[0]).toMatchObject({ amountCents: 1784500, sellerAmountCents: 1784500, parcels: [{ weightGrams: 2310, quoteMargin: { status: "applied" } }] });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it("offers only selectable services returned for the padded parcel, preserving their prices", async () => {
    const deps = setup(), other = { ...rate, carrierId: 2, carrierName: "Otro", amountCents: 2000000, sellerAmountCents: 1900000 };
    deps.rates.quoteShipment.mockResolvedValue([rate, other]);
    const quoted = await quoteShipping(deps, { items, destination });
    expect(quoted.options.map(q => [q.carrierId, q.amountCents, q.sellerAmountCents, q.parcels[0].quoteMargin?.status])).toEqual([[208, rate.amountCents, rate.sellerAmountCents, "applied"], [2, 2000000, 1900000, "applied"]]);
  });
  it.each([new UnavailableCourierRateError(), new CourierProviderUnavailableError(), new InvalidCourierRateError(), new ShippingRateLimitedError(), new Error("unexpected")])("never falls back to unpadded parcels after an error: %s", async error => {
    const deps = setup(); deps.rates.quoteShipment.mockRejectedValueOnce(error).mockResolvedValue([rate]);
    await expect(quoteShipping(deps, { items, destination })).rejects.toBe(error);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
    expect(deps.rates.quoteShipment.mock.calls[0][0].parcels[0].weightGrams).toBe(2310);
  });
  it("returns no quote when no service accepts the padded parcel", async () => {
    const deps = setup(); deps.rates.quoteShipment.mockResolvedValueOnce([]).mockResolvedValue([rate]);
    await expect(quoteShipping(deps, { items, destination })).rejects.toBeInstanceOf(UnavailableCourierRateError);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it("blocks before the API when full margin exceeds a box or input limit", async () => {
    const deps = { ...setup(), constraints: { ...setup().constraints, maxWeightGrams: 2200 } };
    await expect(quoteShipping(deps, { items, destination })).rejects.toBeInstanceOf(ParcelLimitExceededError);
    expect(deps.rates.quoteShipment).not.toHaveBeenCalled();
  });
  it("invalidates unpaid quotes after a policy change without another API call", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    deps.marginPolicy.weightPercent = 6;
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(quoted.options[0].token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierQuoteMismatchError);
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
  });
  it("rejects the previous optional-margin policy even when its token is authentic", async () => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    const plan = await planShippingParcels(deps, items);
    const oldFingerprint = createHash("sha256").update(JSON.stringify({ version: "quote-margin-v1", base: plan.fingerprint, ...deps.marginPolicy })).digest("hex");
    const previous = deps.issuer.issue({ ...quoted.options[0], planFingerprint: oldFingerprint });
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(previous.token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierQuoteMismatchError);
  });
  it.each(["price_changed", "unavailable", "limits"] as const)("rejects a signed unpadded selection marked %s", async status => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    const plan = await planShippingParcels(deps, items), base = plan.parcels[0];
    const { weightGrams, heightCm, widthCm, lengthCm } = base;
    const previous = deps.issuer.issue({ ...quoted.options[0], parcels: [{ ...base, quoteMargin: { status, base: { weightGrams, heightCm, widthCm, lengthCm } } }] });
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(previous.token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierQuoteMismatchError);
  });
  it.each(["amountCents", "sellerAmountCents"] as const)("rejects a later change in %s before paying", async field => {
    const deps = setup(), quoted = await quoteShipping(deps, { items, destination });
    deps.rates.quoteShipment.mockResolvedValue([{ ...rate, [field]: rate[field] + 1 }]);
    const verifier = new ZipnovaCheckoutQuotes(deps);
    await expect(verifier.verifyForCheckout(verifier.verify(quoted.options[0].token), { items: contextItems, destination })).rejects.toBeInstanceOf(CourierRateChangedError);
  });
  it("makes just the base call when margin is explicitly disabled in server configuration", async () => {
    const deps = { ...setup(), marginPolicy: undefined };
    const quoted = await quoteShipping(deps, { items, destination });
    expect(deps.rates.quoteShipment).toHaveBeenCalledTimes(1);
    expect(quoted.options[0].parcels[0].quoteMargin).toBeUndefined();
  });
});
