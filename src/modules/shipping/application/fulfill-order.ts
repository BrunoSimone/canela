import { randomUUID } from "node:crypto";
import type { CourierQuoteIssuer } from "../domain/courier-quote";
import { rateKey } from "../domain/courier-quote";
import { FulfillmentError, validateShipmentOrder, preparedParcels, preparedQuoteFingerprint, validatePreparedQuote, type FulfillmentContext, type ShipmentGateway, type ShipmentRecord, type ShipmentRepository } from "../domain/fulfillment";

export class FulfillOrder {
  constructor(private readonly repository: ShipmentRepository, private readonly gateway: ShipmentGateway, private readonly context: FulfillmentContext, private readonly issuer?: CourierQuoteIssuer) {}

  async confirm(id: string, version: number, actor: string, approvedToken?: string): Promise<ShipmentRecord> {
    const existing = await this.repository.get(id);
    if (existing) return this.refresh(existing);
    const order = await this.repository.loadOrder(id);
    if (!order) throw new FulfillmentError("ORDER_NOT_FOUND", 404);
    validateShipmentOrder(order, version, this.context, !!approvedToken);
    const quote = approvedToken && this.issuer ? this.issuer.authenticate(approvedToken) : order.quote!;
    if (approvedToken) {
      if (!this.issuer) throw new FulfillmentError("SHIPMENT_DISABLED", 503);
      validatePreparedQuote(order, quote);
    }
    const rates = await this.gateway.quoteShipment({ destination: quote.destination, declaredValueCents: quote.merchandiseCents, parcels: quote.parcels });
    const selected = rates.find(rate => rateKey(rate) === rateKey(quote));
    if (!selected || selected.amountCents !== quote.amountCents || selected.sellerAmountCents !== quote.sellerAmountCents) {
      throw new FulfillmentError("SHIPMENT_RATE_CHANGED");
    }
    const claim = await this.repository.claim({ orderId: id, externalId: `CA-${randomUUID().replaceAll("-", "").slice(0, 27)}`,
      preparationVersion: version, buyerEmail: order.buyerEmail, delivery: order.delivery!, quote, ...(approvedToken ? { originalQuote: order.quote! } : {}) }, actor, this.context);
    if (!claim.acquired) return this.refresh(claim.record);
    let record: ShipmentRecord;
    try {
      const remote = await this.gateway.create(claim.record.request);
      record = await this.repository.saveRemote(id, remote);
    } catch {
      // The POST might have succeeded even when the response or local write failed.
      return this.repository.mark(id, "uncertain", "SHIPMENT_CONFIRMATION_UNCERTAIN");
    }
    return this.fetchLabel(record);
  }

  async preview(id: string, version: number) {
    if (!this.issuer) throw new FulfillmentError("SHIPMENT_DISABLED", 503);
    if (await this.repository.get(id)) throw new FulfillmentError("SHIPMENT_ALREADY_CREATED");
    const order = await this.repository.loadOrder(id);
    if (!order) throw new FulfillmentError("ORDER_NOT_FOUND", 404);
    validateShipmentOrder(order, version, this.context, true);
    const original = order.quote!, parcels = preparedParcels(order);
    const rates = await this.gateway.quoteShipment({ destination: original.destination, declaredValueCents: original.merchandiseCents, parcels });
    const rate = rates.find(r => rateKey(r) === rateKey(original));
    if (!rate) throw new FulfillmentError("SHIPMENT_RATE_CHANGED");
    const issuedAt = new Date(), expiresAt = new Date(issuedAt.getTime() + 10 * 60_000);
    const quote = this.issuer.issue({ ...original, ...rate, parcels, planFingerprint: preparedQuoteFingerprint(order), issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() });
    return { quoteToken: quote.token, amountCents: rate.amountCents, sellerAmountCents: rate.sellerAmountCents,
      customerPaidCents: order.shippingCents, differenceCents: rate.sellerAmountCents - order.shippingCents, expiresAt: expiresAt.toISOString() };
  }

  async recover(id: string): Promise<ShipmentRecord> {
    const record = await this.repository.get(id);
    if (!record) throw new FulfillmentError("SHIPMENT_NOT_FOUND", 404);
    return this.refresh(record);
  }

  private async refresh(record: ShipmentRecord): Promise<ShipmentRecord> {
    if (record.request.quote.accountMode !== this.context.accountMode || record.request.quote.contextFingerprint !== this.context.contextFingerprint) {
      throw new FulfillmentError("SHIPMENT_CONTEXT_CHANGED");
    }
    if (record.state === "review" || record.state === "label_ready") return record;
    if (record.remote) return this.fetchLabel(record);
    // Leave a live creator time to finish. Recovery never issues a second POST.
    if (record.state === "creating" && Date.now() - Date.parse(record.createdAt) < 60_000) return record;
    try {
      const remote = await this.gateway.find(record.request);
      if (!remote) return this.repository.mark(record.orderId, "uncertain", "SHIPMENT_NOT_YET_FOUND");
      return this.fetchLabel(await this.repository.saveRemote(record.orderId, remote));
    } catch {
      return this.repository.mark(record.orderId, "uncertain", "SHIPMENT_CONFIRMATION_UNCERTAIN");
    }
  }

  private async fetchLabel(record: ShipmentRecord): Promise<ShipmentRecord> {
    if (record.state === "review" || !record.remote || record.state === "label_ready") return record;
    try {
      const pdf = await this.gateway.label(record.remote.id);
      return pdf ? await this.repository.saveLabel(record.orderId, pdf) : record;
    } catch {
      // Shipment remains created; subsequent attempts retrieve its label only.
      return record;
    }
  }
}
