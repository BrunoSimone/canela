import { describe, expect, it, vi } from "vitest";
import { dependencies, destination, items } from "../../testing/fixtures";
import { quoteShipping } from "../../application/quote-shipping";
import { CourierProviderUnavailableError, ShippingRateLimitedError } from "../../domain/courier-quote";
import { handleShippingQuote } from "./quote-handler";
const request = (body: unknown) => new Request("http://localhost/api/shipping/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("shipping quote HTTP boundary", () => {
  it("returns public options and authoritative product prices without provider internals", async () => {
    const deps = dependencies();
    const r = await handleShippingQuote(request({ items, destination, amountCents: 0 }), { enabled: true, quote: input => quoteShipping(deps, input) });
    expect(r.status).toBe(200); expect(r.headers.get("Cache-Control")).toBe("no-store");
    const body = await r.json();
    expect(body.subtotalCents).toBe(3000000); expect(body.options[0]).toMatchObject({ carrierName: "OCA", shippingCents: 1425300, parcelCount: 2 });
    expect(Object.keys(body.options[0]).sort()).toEqual(["carrierName","expiresAt","parcelCount","quoteToken","serviceName","shippingCents"].sort());
  });
  it.each([null, {}, { items: [], destination }, { items, destination: { ...destination, postalCode: "0000" } }, { items, destination: { ...destination, provinceCode: "XX" } }, { items: [{ productId: "piece", quantity: 999 }], destination }])("rejects bad requests before calling provider: %j", async body => {
    const quote = vi.fn(); const r = await handleShippingQuote(request(body), { enabled: true, quote });
    expect(r.status).toBe(422); expect(quote).not.toHaveBeenCalled();
  });
  it("rejects disabled mode, oversized bodies and cross-site requests", async () => {
    const quote = vi.fn();
    expect((await handleShippingQuote(request({}), { enabled: false, quote })).status).toBe(404);
    expect((await handleShippingQuote(request({ x: "a".repeat(18000) }), { enabled: true, quote })).status).toBe(422);
    const cross = request({ items, destination }); cross.headers.set("Sec-Fetch-Site","cross-site");
    expect((await handleShippingQuote(cross, { enabled: true, quote })).status).toBe(422);
    expect(quote).not.toHaveBeenCalled();
  });
  it.each([[new CourierProviderUnavailableError("secret"),503,"SHIPPING_PROVIDER_UNAVAILABLE"],[new ShippingRateLimitedError(),429,"SHIPPING_RATE_LIMITED"]])("redacts errors", async (error,status,code) => {
    const r=await handleShippingQuote(request({ items,destination }),{ enabled:true,quote:vi.fn().mockRejectedValue(error) });
    expect(r.status).toBe(status); expect(await r.json()).toEqual({code});
  });
});
