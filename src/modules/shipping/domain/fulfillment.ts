import { isDeepStrictEqual } from 'node:util';
import { createHash } from "node:crypto";
import type { DeliverySnapshot } from "../../checkout/domain/delivery";
import type { OrderPreparation } from "../../admin/domain/preparation";
import { sameDestination, type CourierQuoteSnapshot, type ShipmentRateGateway } from "./courier-quote";

export type DispatchSummary = { dispatchedAt: string; dispatchedBy: string };
export type ShipmentState = "creating" | "uncertain" | "created" | "label_ready" | "review";
export type ShipmentRequest = {
  orderId: string;
  externalId: string;
  preparationVersion: number;
  buyerEmail: string;
  delivery: DeliverySnapshot;
  quote: CourierQuoteSnapshot;
  originalQuote?: CourierQuoteSnapshot;
};
export type ShipmentOrder = {
  productionState?: string;
  environment?: "test" | "production";
  id: string; status: string; currency: string; buyerEmail: string;
  subtotalCents: number; shippingCents: number;
  delivery: DeliverySnapshot | null; quote: CourierQuoteSnapshot | null;
  preparation: OrderPreparation | null;
};
export type RemoteShipment = {
  id: number; externalId: string; status: string; trackingNumber: string | null;
  trackingUrl: string | null; amountCents: number;
};
export type ShipmentRecord = {
  orderId: string; externalId: string; state: ShipmentState;
  request: ShipmentRequest; remote: RemoteShipment | null;
  lastError: string | null; createdAt: string;
};
export type ShipmentSummary = Pick<ShipmentRecord, "state" | "lastError"> & {
  remoteId: number | null; trackingNumber: string | null; trackingUrl: string | null;
  sandbox: boolean;
};
export function shipmentSummary(record: ShipmentRecord): ShipmentSummary {
  return { state: record.state, lastError: record.lastError, remoteId: record.remote?.id ?? null,
    trackingNumber: record.remote?.trackingNumber ?? null, trackingUrl: record.remote?.trackingUrl ?? null,
    sandbox: record.request.quote.accountMode === "sandbox" };
}
export class FulfillmentError extends Error {
  constructor(readonly code: string, readonly status = 409) { super(code); this.name = "FulfillmentError"; }
}
export type FulfillmentContext = { accountMode: string; contextFingerprint: string; maxParcels: number };
export function validateShipmentOrder(order: ShipmentOrder, version: number, context: FulfillmentContext, allowPreparedChanges = false): void {
  if (order.productionState && order.productionState !== "ready") throw new FulfillmentError("SHIPMENT_PRODUCTION_REQUIRED");
  if (!["paid", "fulfillment_pending"].includes(order.status)) throw new FulfillmentError("SHIPMENT_PAYMENT_REQUIRED");
  if (!order.preparation || order.preparation.version !== version) throw new FulfillmentError("SHIPMENT_PREPARATION_CHANGED");
  const quote = order.quote;
  if (!quote || quote.provider !== "zipnova" || quote.version !== 3 || quote.accountMode !== ((order.environment ?? "test") === "production" ? "operational" : "sandbox") ||
      context.accountMode !== quote.accountMode || quote.contextFingerprint !== context.contextFingerprint ||
      quote.dispatchType !== "carrier_dropoff") throw new FulfillmentError("SHIPMENT_CONTEXT_CHANGED");
  if (!order.delivery?.phone || !order.delivery.recipientDocument || !order.buyerEmail ||
      !sameDestination(order.delivery, quote.destination)) throw new FulfillmentError("SHIPMENT_RECIPIENT_INCOMPLETE");
  if (order.currency !== "ARS" || order.subtotalCents !== quote.merchandiseCents || order.shippingCents !== quote.amountCents) {
    throw new FulfillmentError("SHIPMENT_ORDER_MISMATCH");
  }
  const dimensions = (p: {weightGrams:number;heightCm:number;widthCm:number;lengthCm:number}) => [p.weightGrams,p.heightCm,p.widthCm,p.lengthCm].join(":");
  if (quote.parcels.length !== 1 || quote.parcels.length > context.maxParcels ||
      quote.parcels.some(p => !p.classificationId || p.weightGrams < 10) ||
      (!allowPreparedChanges && JSON.stringify(quote.parcels.map(dimensions).sort()) !== JSON.stringify(order.preparation.parcels.map(dimensions).sort())) ||
      order.preparation.parcels.length !== 1) {
    throw new FulfillmentError("SHIPMENT_PACKAGING_CHANGED");
  }
}
export interface ShipmentRepository {
  loadOrder(id: string): Promise<ShipmentOrder | null>;
  get(id: string): Promise<ShipmentRecord | null>;
  claim(request: ShipmentRequest, actor: string, context: FulfillmentContext): Promise<{record: ShipmentRecord; acquired: boolean}>;
  saveRemote(id: string, remote: RemoteShipment): Promise<ShipmentRecord>;
  mark(id: string, state: "uncertain" | "review", code: string): Promise<ShipmentRecord>;
  saveLabel(id: string, bytes: Uint8Array): Promise<ShipmentRecord>;
  readLabel(id: string): Promise<Uint8Array | null>;
}
export interface ShipmentGateway extends ShipmentRateGateway {
  create(request: ShipmentRequest): Promise<RemoteShipment>;
  find(request: ShipmentRequest): Promise<RemoteShipment | null>;
  label(id: number): Promise<Uint8Array | null>;
}

export function preparedParcels(order: ShipmentOrder) {
  const { packing: _packing, quoteMargin: _margin, ...parcel } = order.quote!.parcels[0];
  void _packing;
  void _margin;
  return [{ ...parcel, ...order.preparation!.parcels[0] }];
}
export function preparedQuoteFingerprint(order: ShipmentOrder): string {
  return createHash("sha256").update(JSON.stringify({ orderId: order.id, preparationVersion: order.preparation!.version,
    originalFingerprint: order.quote!.planFingerprint, parcels: preparedParcels(order) })).digest("hex");
}
export function validatePreparedQuote(order: ShipmentOrder, quote: CourierQuoteSnapshot): void {
  const original = order.quote!;
  const keys = ["provider", "accountMode", "contextFingerprint", "cartFingerprint", "merchandiseCents", "carrierId", "serviceCode", "dispatchType"] as const;
  if (keys.some(key => original[key] !== quote[key]) || !sameDestination(original.destination, quote.destination) ||
      quote.planFingerprint !== preparedQuoteFingerprint(order) || !isDeepStrictEqual(quote.parcels,preparedParcels(order))) {
    throw new FulfillmentError("SHIPMENT_PREPARATION_CHANGED");
  }
}
