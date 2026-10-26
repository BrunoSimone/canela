import { randomUUID } from "node:crypto";
import { parseDeliverySnapshot } from "@/modules/checkout/domain/delivery";
import { dimensions, validateDesign, type MosaicDesign, type WorkshopConfig } from "../domain/design";
import { estimateFrame, type PricingPolicy } from "../domain/estimate";
import { DemoPurchaseError, type DemoOrder, type DemoOutcome, type DemoQuote, type DemoRecipient } from "../domain/purchase";

export type DemoPurchasePolicy = {
  quoteTtlMs: number; retentionMs: number; maxQuotes: number; capacity: number;
  productionDays: number; transitDays: number; packagingExtraCm: number; depthCm: number;
  packages: { maxCells: number; weightGrams: number; shippingCents: number }[]; otherProvinceCents: number;
};
type Entry = { quote: DemoQuote; forgetAt: number; order?: DemoOrder; attempts: Map<string, { outcome: DemoOutcome; order: DemoOrder }> };
const invalid = () => new DemoPurchaseError("INVALID_INPUT", "Revisá los datos del diseño y del domicilio.");
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid();
  return input as Record<string, unknown>;
}
function identifier(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw invalid();
  return value;
}
function outcome(value: unknown): DemoOutcome {
  if (value !== "approved" && value !== "pending" && value !== "rejected") throw invalid();
  return value;
}

/** Local-only fake store. No persistence, outbound IO or production dependencies. */
export class DemoPurchaseService {
  private entries = new Map<string, Entry>();
  private config: WorkshopConfig;
  private pricing: PricingPolicy;
  private policy: DemoPurchasePolicy;
  constructor(config: WorkshopConfig, pricing: PricingPolicy, policy: DemoPurchasePolicy, private now = Date.now) {
    this.config = structuredClone(config); this.pricing = structuredClone(pricing); this.policy = structuredClone(policy);
  }
  private clean() { for (const [id, entry] of this.entries) if (entry.forgetAt <= this.now()) this.entries.delete(id); }
  activeCount() {
    this.clean();
    return [...this.entries.values()].filter(e => e.order?.status === "approved" || (e.order?.status === "pending" && Date.parse(e.quote.expiresAt) > this.now())).length;
  }
  private entry(id: unknown): Entry {
    this.clean(); const entry = this.entries.get(identifier(id));
    if (!entry) throw new DemoPurchaseError("QUOTE_EXPIRED", "La prueba venció o el servidor se reinició. Volvé a cotizar el envío.", 410);
    return entry;
  }
  private unexpired(entry: Entry) {
    if (Date.parse(entry.quote.expiresAt) <= this.now()) throw new DemoPurchaseError("QUOTE_EXPIRED", "La cotización venció. Volvé a cotizar el envío.", 410);
  }
  snapshot(id: string): DemoQuote { return structuredClone(this.entry(id).quote); }
  quote(input: unknown): DemoQuote {
    this.clean(); const request = record(input); const selection = record(request.design);
    if (request.accepted !== true) throw invalid();
    if (selection.configurationId !== this.config.id || selection.configurationVersion !== this.config.version) {
      throw new DemoPurchaseError("DESIGN_CHANGED", "Las opciones del taller cambiaron. Volvé al creador y recargá la página.", 409);
    }
    let design: MosaicDesign; let recipient: DemoRecipient;
    try {
      design = { version: selection.version, algorithm: selection.algorithm, size: selection.size, cells: selection.cells, config: this.config } as MosaicDesign;
      validateDesign(design);
      const buyer = record(request.recipient);
      if (typeof buyer.email !== "string" || buyer.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) throw invalid();
      const delivery = parseDeliverySnapshot(buyer.delivery);
      if (!delivery.phone || !delivery.recipientDocument) throw invalid();
      recipient = { email: buyer.email.trim().toLowerCase(), delivery };
    } catch { throw invalid(); }
    const parcel = this.policy.packages.find(p => design.size <= p.maxCells);
    if (!parcel) throw invalid();
    if (this.entries.size >= this.policy.maxQuotes) throw new DemoPurchaseError("DEMO_LIMIT", "Hay muchas pruebas abiertas. Esperá unos minutos antes de continuar.", 429);
    const frame = estimateFrame(this.config, design.size, this.pricing);
    const side = Math.ceil(dimensions(this.config, design.size).framedMm / 10) + this.policy.packagingExtraCm;
    const shipping = {
      cents: parcel.shippingCents + (recipient.delivery.provinceCode === "B" ? 0 : this.policy.otherProvinceCents),
      name: "Envío a domicilio de prueba", transitDays: this.policy.transitDays,
      package: { widthCm: side, heightCm: side, depthCm: this.policy.depthCm, weightGrams: parcel.weightGrams },
    };
    const quote: DemoQuote = { mode: "demo", id: randomUUID(), expiresAt: new Date(this.now() + this.policy.quoteTtlMs).toISOString(), design, recipient, frame, shipping, totalCents: frame.totalCents + shipping.cents, productionDays: this.policy.productionDays };
    this.entries.set(quote.id, { quote: structuredClone(quote), forgetAt: this.now() + this.policy.retentionMs, attempts: new Map() });
    return structuredClone(quote);
  }
  pay(input: unknown): DemoOrder {
    const request = record(input); const entry = this.entry(request.quoteId);
    const attemptId = identifier(request.attemptId); const result = outcome(request.outcome);
    const previous = entry.attempts.get(attemptId);
    if (previous) {
      if (previous.outcome !== result) throw new DemoPurchaseError("ATTEMPT_CONFLICT", "Ese intento ya usó otro resultado. Iniciá un nuevo intento.", 409);
      if (previous.order.status === "pending") this.unexpired(entry);
      return structuredClone(previous.order);
    }
    if (entry.order?.status === "approved") return structuredClone(entry.order);
    this.unexpired(entry);
    if (entry.order?.status === "pending") return structuredClone(entry.order);
    if (entry.attempts.size >= 10) throw new DemoPurchaseError("DEMO_LIMIT", "Esta prueba alcanzó el límite de intentos. Volvé a cotizar.", 429);
    // Synchronous check + write: capacity cannot be overbooked within this local store.
    if (result !== "rejected" && this.activeCount() >= this.policy.capacity) throw new DemoPurchaseError("CAPACITY_FULL", "La capacidad de prueba está completa. Esperá a que termine otra simulación.", 409);
    const order: DemoOrder = { mode: "demo", id: `DEMO-${randomUUID()}`, quoteId: entry.quote.id, status: result, production: result === "approved" ? "simulated" : "not_started" };
    entry.order = order; entry.attempts.set(attemptId, { outcome: result, order });
    return structuredClone(order);
  }
  resolve(input: unknown): DemoOrder {
    const request = record(input); const entry = this.entry(request.quoteId); const result = outcome(request.outcome);
    if (result === "pending" || !entry.order || entry.order.id !== identifier(request.orderId)) throw invalid();
    if (entry.order.status === result) return structuredClone(entry.order);
    if (entry.order.status !== "pending") throw new DemoPurchaseError("ALREADY_RESOLVED", "Este intento ya está resuelto.", 409);
    this.unexpired(entry);
    entry.order.status = result; entry.order.production = result === "approved" ? "simulated" : "not_started";
    return structuredClone(entry.order);
  }
}
