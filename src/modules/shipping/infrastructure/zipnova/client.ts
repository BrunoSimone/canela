import { provinceName } from "../../../checkout/domain/delivery";
import { CourierProviderUnavailableError, InvalidCourierRateError, UnavailableCourierRateError, rateKey, type CourierRate, type DispatchType, type ShipmentQuoteInput, type ShipmentRateGateway } from "../../domain/courier-quote";

export type ZipnovaConfig = { apiToken: string; apiSecret: string; accountId: number; originId: number; dispatchType: DispatchType };
export class ZipnovaClient implements ShipmentRateGateway {
  constructor(private readonly config: ZipnovaConfig, private readonly fetcher: typeof fetch = fetch) {}
  async quoteShipment(input: ShipmentQuoteInput): Promise<CourierRate[]> {
    const payload = {
      account_id: this.config.accountId, origin_id: this.config.originId, source: "canela",
      declared_value: input.declaredValueCents / 100,
      destination: { city: input.destination.city, state: input.destination.provinceCode === "C" ? "Ciudad de Buenos Aires" : provinceName(input.destination.provinceCode), zipcode: input.destination.postalCode },
      packages: input.parcels.map(p => {
        if (!p.classificationId || !/^[A-Za-z0-9_-]{1,50}$/.test(p.classificationId) || p.weightGrams < 10) throw new InvalidCourierRateError();
        return { weight: p.weightGrams, height: p.heightCm, width: p.widthCm, length: p.lengthCm, classification_id: p.classificationId, description_1: "Pedido Canela" };
      }),
      service_type: "standard_delivery", logistic_type: this.config.dispatchType, sort_by: "price",
    };
    let response: Response;
    let body: unknown;
    try {
      response = await this.fetcher("https://api.zipnova.com.ar/v2/shipments/quote", {
        method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(12000),
        headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${this.config.apiToken}:${this.config.apiSecret}`).toString("base64")}` },
        body: JSON.stringify(payload),
      });
      body = await response.json();
    } catch { throw new CourierProviderUnavailableError(); }
    if (!response.ok) {
      // This exact response was observed for uncovered pickup. Other errors stay unavailable.
      if (response.status === 400 && isRecord(body) && Array.isArray(body.errors) &&
          body.errors.includes("No hay tarifarios para el destino asignado")) throw new UnavailableCourierRateError();
      throw new CourierProviderUnavailableError();
    }
    if (!isRecord(body) || !Array.isArray(body.all_results) || !Array.isArray(body.packages) || body.packages.length !== input.parcels.length) throw new InvalidCourierRateError();
    if (arsToCents(body.declared_value) !== input.declaredValueCents ||
        !isRecord(body.destination) || body.destination.zipcode !== input.destination.postalCode) throw new InvalidCourierRateError();
    // With explicit packages, Zipnova must retain the supplied dimensions.
    const dimensions = (p: Record<string, unknown>) => [p.weight, p.height, p.width, p.length].join(":");
    if (JSON.stringify(body.packages.map(p => isRecord(p) ? dimensions(p) : "invalid").sort()) !==
        JSON.stringify(payload.packages.map(dimensions).sort())) throw new InvalidCourierRateError();
    const rates: CourierRate[] = [];
    for (const option of body.all_results) {
      if (!isRecord(option) || option.selectable !== true) continue;
      if (option.logistic_type !== this.config.dispatchType || !isRecord(option.service_type) || option.service_type.code !== "standard_delivery") continue;
      if (option.impediments != null && !(Array.isArray(option.impediments) && option.impediments.length === 0)) continue;
      if (!isRecord(option.carrier) || !Number.isSafeInteger(option.carrier.id) || (option.carrier.id as number) <= 0 ||
          !nonempty(option.carrier.name) || !nonempty(option.service_type.name) || !isRecord(option.amounts)) throw new InvalidCourierRateError();
      rates.push({ carrierId: option.carrier.id as number, carrierName: option.carrier.name,
        serviceCode: "standard_delivery", serviceName: option.service_type.name, dispatchType: this.config.dispatchType,
        amountCents: arsToCents(option.amounts.price_incl_tax), sellerAmountCents: arsToCents(option.amounts.seller_price_incl_tax) });
    }
    if (!rates.length) throw new UnavailableCourierRateError();
    if (new Set(rates.map(rateKey)).size !== rates.length) throw new InvalidCourierRateError();
    return rates.sort((a,b) => a.amountCents - b.amountCents || a.carrierId - b.carrierId);
  }
}
export function arsToCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new InvalidCourierRateError();
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new InvalidCourierRateError();
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2,"0"));
  if (!Number.isSafeInteger(cents)) throw new InvalidCourierRateError();
  return cents;
}
function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function nonempty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= 120; }
