import { describe, expect, it, vi } from "vitest";
import { CourierProviderUnavailableError, InvalidCourierRateError, UnavailableCourierRateError } from "../../domain/courier-quote";
import { destination } from "../../testing/fixtures";
import { arsToCents, ZipnovaClient } from "./client";

const config = { apiToken: "test-token", apiSecret: "test-secret", accountId: 12, originId: 34, dispatchType: "carrier_dropoff" as const };
const parcel = { weightGrams: 1000, heightCm: 10, widthCm: 20, lengthCm: 20, classificationId: "1", items: [{ productId: "piece", quantity: 1 }], groupingRule: null };
const input = { destination, declaredValueCents: 3000000, parcels: [parcel, parcel] };
function response() { return { declared_value: 30000, destination: { zipcode: "1425" }, packages: [{ weight: 1000, height: 10, width: 20, length: 20 }, { weight: 1000, height: 10, width: 20, length: 20 }], all_results: [
  { selectable: true, impediments: null, logistic_type: "carrier_dropoff", carrier: { id: 208, name: "OCA" }, service_type: { code: "standard_delivery", name: "Entrega a domicilio" }, amounts: { price_incl_tax: 14253, seller_price_incl_tax: 14253 }, delivery_time: { estimation_expires_at: "2000-01-01" } },
] }; }
describe("Zipnova HTTP adapter", () => {
  it("uses one quote request, all packages, declared value and required auth with no redirects", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response()));
    const rates = await new ZipnovaClient(config, fetcher).quoteShipment(input);
    expect(rates[0].amountCents).toBe(1425300); // Not two individual tariffs.
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0]; const body = JSON.parse(options!.body as string);
    expect(url).toBe("https://api.zipnova.com.ar/v2/shipments/quote");
    expect(options).toMatchObject({ redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) });
    expect(body).toMatchObject({ account_id: 12, origin_id: 34, declared_value: 30000, logistic_type: "carrier_dropoff", destination: { city: "Palermo", state: "Ciudad de Buenos Aires", zipcode: "1425" } });
    expect(body.packages).toHaveLength(2); expect(body.items).toBeUndefined();
    expect((options!.headers as Record<string,string>).Authorization).toBe(`Basic ${Buffer.from("test-token:test-secret").toString("base64")}`);
  });
  it("rejects nonselectable or impeded rates rather than offering zero", async () => {
    const body = response(); body.all_results[0].selectable = false;
    await expect(new ZipnovaClient(config, vi.fn().mockResolvedValue(Response.json(body))).quoteShipment(input)).rejects.toBeInstanceOf(UnavailableCourierRateError);
  });
  it("does not accept silent package dimension changes or ambiguous carrier options", async () => {
    const body = response(); body.packages[0].weight = 500;
    await expect(new ZipnovaClient(config, vi.fn().mockResolvedValue(Response.json(body))).quoteShipment(input)).rejects.toBeInstanceOf(InvalidCourierRateError);
    const duplicate = response(); duplicate.all_results.push(duplicate.all_results[0]);
    await expect(new ZipnovaClient(config, vi.fn().mockResolvedValue(Response.json(duplicate))).quoteShipment(input)).rejects.toBeInstanceOf(InvalidCourierRateError);
  });
  it.each([401, 403, 422, 429, 500, 503])("redacts provider errors for HTTP %s", async status => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ message: "sensitive-provider-data" }, { status }));
    await expect(new ZipnovaClient(config, fetcher).quoteShipment(input)).rejects.toBeInstanceOf(CourierProviderUnavailableError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("maps the observed uncovered pickup error and handles network failure", async () => {
    await expect(new ZipnovaClient(config, vi.fn().mockResolvedValue(Response.json({ errors: ["No hay tarifarios para el destino asignado"] }, { status: 400 }))).quoteShipment(input)).rejects.toBeInstanceOf(UnavailableCourierRateError);
    await expect(new ZipnovaClient(config, vi.fn().mockRejectedValue(new Error("test-secret"))).quoteShipment(input)).rejects.toThrow(CourierProviderUnavailableError);
  });
  it.each([[12600,1260000],[15911.16,1591116],[0.29,29],[1.1,110],[0,0]])("converts ARS %s to %s exact cents", (ars,cents) => { expect(arsToCents(ars)).toBe(cents); });
  it.each([-1, NaN, Infinity, 0.001, "12.00", null, Number.MAX_SAFE_INTEGER])("rejects invalid money %s", v => { expect(() => arsToCents(v)).toThrow(); });
});
