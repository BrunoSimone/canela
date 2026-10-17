import type { InventoryProduct, Stock, StockEdit } from "./stock-edit";

export type ReservationItem = { productId: string; quantity: number };
export interface InventoryStore {
  reserve(orderId: string, fingerprint: string, items: ReservationItem[]): Promise<void>;
  settle(orderId: string, state: "consumed" | "released"): Promise<boolean>;
  list(products: InventoryProduct[]): Promise<(InventoryProduct & Stock)[]>;
  save(product: InventoryProduct, edit: StockEdit, actor: string): Promise<Stock>;
  history(productId: string): Promise<unknown[]>;
  listAvailableProductIds(): Promise<Set<string>>;
}
export class InventoryConflict extends Error {}
export class InventoryShortage extends Error {
  constructor(readonly productIds: string[]) { super("INVENTORY_UNAVAILABLE"); }
}
export class ReservationClosed extends Error {}

export type Document = { _id: string; _type: string; _rev: string; [key: string]: unknown };
export type Mutation = { create: Omit<Document, "_rev"> } | { patch: { id: string; ifRevisionID: string; set: Record<string, unknown> } };
export interface InventoryDocuments {
  get(ids: string[]): Promise<(Document | null)[]>;
  commit(mutations: Mutation[]): Promise<void>;
  query(query: string, params: Record<string, unknown>): Promise<Document[]>;
}
