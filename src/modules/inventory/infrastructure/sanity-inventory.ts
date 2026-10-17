import { createHash } from "node:crypto";
import { InventoryConflict, InventoryShortage, ReservationClosed, type Document, type InventoryDocuments, type InventoryStore, type Mutation, type ReservationItem } from "../domain/inventory-store";
import { StockEditError, type InventoryProduct, type Stock, type StockEdit } from "../domain/stock-edit";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const stockId = (id: string) => `inventory.${hash(id)}`;
const reservationId = (id: string) => `reservation.${hash(id)}`;
const empty: Stock = { stockOnHand: 0, reserved: 0, enabled: false, version: 0 };
function stock(doc: Document | null): Stock {
  if (!doc) return { ...empty };
  const s = doc as unknown as Stock;
  if (![s.stockOnHand, s.reserved, s.version].every(n => Number.isSafeInteger(n) && n >= 0) || s.reserved > s.stockOnHand || typeof s.enabled !== "boolean") throw Error("INVALID_INVENTORY_DOCUMENT");
  return { stockOnHand: s.stockOnHand, reserved: s.reserved, enabled: s.enabled, version: s.version };
}
function update(doc: Document, fields: Record<string, unknown>): Mutation {
  return { patch: { id: doc._id, ifRevisionID: doc._rev, set: fields } };
}
export class SanityInventory implements InventoryStore {
  constructor(private readonly documents: InventoryDocuments) {}
  async list(products: InventoryProduct[]) {
    if (!products.length) return [];
    const docs = await this.documents.get(products.map(p => stockId(p.id)));
    return products.map((p, i) => ({ ...p, ...stock(docs[i]) }));
  }
  async listAvailableProductIds() {
    const docs = await this.documents.query('*[_type == "canelaInventory" && enabled == true && stockOnHand > reserved]', {});
    return new Set(docs.map(d => String(d.productId)));
  }
  async save(product: InventoryProduct, input: StockEdit, actor: string): Promise<Stock> {
    if (product.tone === "unica" && input.stockOnHand > 1) throw new StockEditError("UNIQUE_PIECE_LIMIT");
    if (product.tone === "encargo" && input.enabled) throw new StockEditError("MADE_TO_ORDER_NOT_SELLABLE");
    const id = stockId(product.id), auditId = `inventoryChange.${input.mutationId}`;
    const fingerprint = hash(JSON.stringify({ productId: product.id, input, actor }));
    return this.retry(async () => {
      const [doc, previous] = await this.documents.get([id, auditId]);
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new StockEditError("STOCK_RETRY_CONFLICT");
        return previous.after as Stock;
      }
      const before = stock(doc);
      if (before.version !== input.expectedVersion || before.stockOnHand !== input.expectedStock || before.reserved !== input.expectedReserved) throw new StockEditError("STOCK_CHANGED");
      if (input.stockOnHand < before.reserved) throw new StockEditError("STOCK_BELOW_RESERVED");
      const after = { ...before, stockOnHand: input.stockOnHand, enabled: input.enabled, version: before.version + 1 };
      await this.documents.commit([
        doc ? update(doc, after) : { create: { _id: id, _type: "canelaInventory", productId: product.id, ...after } },
        { create: { _id: auditId, _type: "canelaInventoryChange", productId: product.id, fingerprint, before, after, actor, reason: input.reason, at: new Date().toISOString() } },
      ]);
      return after;
    });
  }
  async history(productId: string) {
    return this.documents.query('*[_type == "canelaInventoryChange" && productId == $productId] | order(at desc)[0...20]', { productId });
  }
  async reserve(orderId: string, fingerprint: string, requested: ReservationItem[]) {
    const items = [...requested].sort((a, b) => a.productId.localeCompare(b.productId));
    if (!items.length || new Set(items.map(i => i.productId)).size !== items.length || items.some(i => !i.productId || !Number.isSafeInteger(i.quantity) || i.quantity <= 0)) throw Error("INVALID_RESERVATION");
    const id = reservationId(orderId), requestHash = hash(JSON.stringify({ fingerprint, items }));
    return this.retry(async () => {
      const [reservation, ...docs] = await this.documents.get([id, ...items.map(i => stockId(i.productId))]);
      if (reservation) {
        if (reservation.state !== "active") throw new ReservationClosed();
        if (reservation.fingerprint !== requestHash) throw Error("RESERVATION_RETRY_CONFLICT");
        return;
      }
      const stocks = docs.map(stock);
      const unavailable = items.filter((item, i) => !stocks[i].enabled || stocks[i].stockOnHand - stocks[i].reserved < item.quantity).map(i => i.productId);
      if (unavailable.length) throw new InventoryShortage(unavailable);
      await this.documents.commit([
        ...items.map((item, i) => update(docs[i]!, { reserved: stocks[i].reserved + item.quantity, version: stocks[i].version + 1 })),
        { create: { _id: id, _type: "canelaReservation", orderId, fingerprint: requestHash, items, state: "active", at: new Date().toISOString() } },
      ]);
    });
  }
  async settle(orderId: string, state: "consumed" | "released"): Promise<boolean> {
    const id = reservationId(orderId);
    return this.retry(async () => {
      const [reservation] = await this.documents.get([id]);
      if (!reservation) {
        if (state === "consumed") return false;
        // A tombstone prevents late reservation after an abandoned checkout is cancelled.
        await this.documents.commit([{ create: { _id: id, _type: "canelaReservation", orderId, state, items: [], at: new Date().toISOString() } }]);
        return true;
      }
      if (reservation.state === state) return true;
      if (reservation.state !== "active") return false;
      const items = reservation.items as ReservationItem[];
      if (!Array.isArray(items) || !items.length || new Set(items.map(i => i.productId)).size !== items.length || items.some(i => typeof i.productId !== "string" || !Number.isSafeInteger(i.quantity) || i.quantity <= 0)) throw Error("INVALID_RESERVATION_DOCUMENT");
      const docs = await this.documents.get(items.map(i => stockId(i.productId)));
      const stocks = docs.map(stock);
      if (items.some((item, i) => !docs[i] || stocks[i].reserved < item.quantity)) throw Error("INVENTORY_INTEGRITY_ERROR");
      await this.documents.commit([
        ...items.map((item, i) => update(docs[i]!, { reserved: stocks[i].reserved - item.quantity, stockOnHand: stocks[i].stockOnHand - (state === "consumed" ? item.quantity : 0), version: stocks[i].version + 1 })),
        update(reservation, { state, settledAt: new Date().toISOString() }),
      ]);
      return true;
    });
  }
  private async retry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await operation(); }
      catch (error) { if (!(error instanceof InventoryConflict) || attempt >= 5) throw error; }
    }
  }
}
