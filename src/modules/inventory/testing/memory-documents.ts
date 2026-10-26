import { randomUUID } from "node:crypto";
import { InventoryConflict, type Document, type InventoryDocuments, type Mutation } from "../domain/inventory-store";
import { SanityInventory, stockId } from "../infrastructure/sanity-inventory";

/** A document-store boundary double; production inventory logic runs unchanged. */
export class MemoryDocuments implements InventoryDocuments {
  readonly data = new Map<string, Document>();
  async get(ids: string[]) { return ids.map(id => structuredClone(this.data.get(id) ?? null)); }
  async commit(mutations: Mutation[]) {
    for (const mutation of mutations) {
      if ("create" in mutation ? this.data.has(String(mutation.create._id)) : this.data.get(mutation.patch.id)?._rev !== mutation.patch.ifRevisionID) throw new InventoryConflict();
    }
    for (const mutation of mutations) {
      if ("create" in mutation) this.data.set(String(mutation.create._id), { ...structuredClone(mutation.create), _rev: randomUUID() } as Document);
      else this.data.set(mutation.patch.id, { ...this.data.get(mutation.patch.id)!, ...structuredClone(mutation.patch.set), _rev: randomUUID() });
    }
  }
  async query(query: string, params: Record<string, unknown>) {
    return [...this.data.values()].filter(d => query.includes("canelaInventoryChange")
      ? d._type === "canelaInventoryChange" && d.productId === params.productId
      : d._type === "canelaInventory" && d.enabled === true && Number(d.stockOnHand) > Number(d.reserved)).map(d => structuredClone(d));
  }
  seed(id: string, quantity: number, reserved = 0) {
    this.data.set(stockId(id), { _id: stockId(id), _type: "canelaInventory", _rev: randomUUID(), productId: id, stockOnHand: quantity, reserved, enabled: true, version: 0 });
  }
}
export function inventoryFixture() {
  const documents = new MemoryDocuments();
  const inventory = new SanityInventory(documents);
  return { documents, inventory, stock: async (id: string) => (await inventory.list([{ id, name: id, price: 1 }]))[0] };
}
