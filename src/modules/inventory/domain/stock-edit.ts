export type StockEdit = { mutationId: string; expectedVersion: number; expectedStock: number; expectedReserved: number; stockOnHand: number; enabled: boolean; reason: string };
export class StockEditError extends Error { constructor(readonly code: string, readonly status = 409) { super(code); } }
export function parseStockEdit(input: unknown): StockEdit {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StockEditError("INVALID_STOCK_EDIT", 422);
  const v = input as Record<string, unknown>;
  if (typeof v.mutationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.mutationId) ||
    ![v.expectedVersion, v.expectedStock, v.expectedReserved, v.stockOnHand].every(n => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= 1000000) ||
    typeof v.enabled !== "boolean" || typeof v.reason !== "string" || v.reason.trim().length < 3 || v.reason.trim().length > 300) throw new StockEditError("INVALID_STOCK_EDIT", 422);
  return { mutationId: v.mutationId, expectedVersion: v.expectedVersion as number, expectedStock: v.expectedStock as number, expectedReserved: v.expectedReserved as number, stockOnHand: v.stockOnHand as number, enabled: v.enabled, reason: v.reason.trim() };
}
export type InventoryProduct = { id: string; name: string; price: number };
export type Stock = { stockOnHand: number; reserved: number; enabled: boolean; version: number };
export type InventoryRow = InventoryProduct & Stock;
