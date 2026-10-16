import type { Sql } from "postgres";
import { StockEditError, type InventoryProduct, type Stock, type StockEdit } from "../../domain/stock-edit";

type Row = { stock_on_hand: number; reserved: number; is_sellable: boolean; version: number };
const map = (r: Row): Stock => ({ stockOnHand: r.stock_on_hand, reserved: r.reserved, enabled: r.is_sellable, version: r.version });
export class StockRepository {
  constructor(private readonly sql: Sql) {}
  async list(products: InventoryProduct[]) {
    if (products.length === 0) return [];
    const rows = await this.sql<(Row & { product_id: string })[]>`SELECT product_id,stock_on_hand,reserved,is_sellable,version FROM inventory_item WHERE product_id IN ${this.sql(products.map(p => p.id))}`;
    return products.map(p => { const row = rows.find(r => r.product_id === p.id); return { ...p, ...(row ? map(row) : { stockOnHand: 0, reserved: 0, enabled: false, version: 0 }) }; });
  }
  async save(product: InventoryProduct, input: StockEdit, actor: string): Promise<Stock> {
    if (product.tone === "unica" && input.stockOnHand > 1) throw new StockEditError("UNIQUE_PIECE_LIMIT");
    if (product.tone === "encargo" && input.enabled) throw new StockEditError("MADE_TO_ORDER_NOT_SELLABLE");
    return this.sql.begin(async tx => {
      // Serialize retries even when the first inventory row does not exist yet.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${product.id}, 17))`;
      const [previous] = await tx`SELECT * FROM inventory_change WHERE id=${input.mutationId}`;
      if (previous) {
        if (previous.product_id !== product.id || previous.actor_email !== actor || Object.entries(input).some(([k,v]) => previous.request_snapshot[k] !== v)) throw new StockEditError("STOCK_RETRY_CONFLICT");
        return previous.after_snapshot as Stock;
      }
      await tx`INSERT INTO inventory_item(product_id,stock_on_hand,reserved,is_sellable) VALUES(${product.id},0,0,false) ON CONFLICT DO NOTHING`;
      const [current] = await tx<Row[]>`SELECT stock_on_hand,reserved,is_sellable,version FROM inventory_item WHERE product_id=${product.id} FOR UPDATE`;
      if (current.version !== input.expectedVersion || current.stock_on_hand !== input.expectedStock || current.reserved !== input.expectedReserved) throw new StockEditError("STOCK_CHANGED");
      if (input.stockOnHand < current.reserved) throw new StockEditError("STOCK_BELOW_RESERVED");
      const [updated] = await tx<Row[]>`UPDATE inventory_item SET stock_on_hand=${input.stockOnHand},is_sellable=${input.enabled},version=version+1,updated_at=now() WHERE product_id=${product.id} RETURNING *`;
      const before = map(current), after = map(updated);
      await tx`INSERT INTO inventory_change(id,product_id,actor_email,reason,request_snapshot,before_snapshot,after_snapshot) VALUES(${input.mutationId},${product.id},${actor},${input.reason},${tx.json(input)},${tx.json(before)},${tx.json(after)})`;
      const delta = after.stockOnHand - before.stockOnHand;
      if (delta !== 0) await tx`INSERT INTO inventory_adjustment(id,product_id,delta,reason,actor) VALUES(${input.mutationId},${product.id},${delta},${input.reason},${actor})`;
      return after;
    });
  }
  async history(productId: string) {
    return this.sql`SELECT actor_email AS actor,reason,before_snapshot AS before,after_snapshot AS after,created_at AS at FROM inventory_change WHERE product_id=${productId} ORDER BY created_at DESC LIMIT 20`;
  }
}
