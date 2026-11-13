import { createHash } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import {
  InventoryShortage,
  ReservationClosed,
  type InventoryStore,
  type ReservationItem,
} from "../domain/inventory-store";
import {
  parseStockEdit,
  StockEditError,
  type InventoryProduct,
  type Stock,
  type StockEdit,
} from "../domain/stock-edit";
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
type StockRow = {
  product_id: string;
  stock_on_hand: number;
  reserved: number;
  enabled: boolean;
  version: number;
};
const map = (r?: StockRow): Stock =>
  r
    ? {
        stockOnHand: r.stock_on_hand,
        reserved: r.reserved,
        enabled: r.enabled,
        version: r.version,
      }
    : { stockOnHand: 0, reserved: 0, enabled: false, version: 0 };

export class PostgresInventory implements InventoryStore {
  constructor(
    private sql: Sql,
    private transaction?: TransactionSql,
  ) {}
  withTransaction(tx: TransactionSql): InventoryStore {
    return new PostgresInventory(this.sql, tx);
  }
  private run<T>(fn: (tx: TransactionSql) => Promise<T>): Promise<T> {
    return this.transaction
      ? fn(this.transaction)
      : (this.sql.begin(fn) as Promise<T>);
  }
  async list(products: InventoryProduct[]) {
    if (!products.length) return [];
    const rows = await this.sql<
      StockRow[]
    >`SELECT * FROM catalog_stock WHERE product_id IN ${this.sql(products.map((p) => p.id))}`;
    const byId = new Map(rows.map((r) => [r.product_id, r]));
    return products.map((p) => ({ ...p, ...map(byId.get(p.id)) }));
  }
  async listAvailableProductIds() {
    const rows = await this
      .sql`SELECT s.product_id FROM catalog_stock s JOIN catalog_entry e ON e.id=s.product_id WHERE s.enabled AND s.stock_on_hand>s.reserved AND NOT e.archived AND e.published IS NOT NULL`;
    return new Set(rows.map((r) => String(r.product_id)));
  }
  async history(id: string) {
    return this
      .sql`SELECT at,actor,reason,before_stock AS before,after_stock AS after FROM catalog_stock_change WHERE product_id=${id} ORDER BY at DESC,id DESC LIMIT 20`;
  }
  async save(product: InventoryProduct, input: StockEdit, actor: string) {
    input = parseStockEdit(input);
    const fingerprint = hash({ productId: product.id, input, actor });
    return this.run(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${input.mutationId},1541))`;
      const [prior] =
        await tx`SELECT * FROM catalog_stock_change WHERE id=${input.mutationId}`;
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new StockEditError("STOCK_RETRY_CONFLICT");
        return prior.after_stock as Stock;
      }
      const [row] = await tx<
        StockRow[]
      >`SELECT * FROM catalog_stock WHERE product_id=${product.id} FOR UPDATE`;
      if (!row) throw new StockEditError("PRODUCT_NOT_FOUND", 404);
      const before = map(row);
      if (
        before.version !== input.expectedVersion ||
        before.stockOnHand !== input.expectedStock ||
        before.reserved !== input.expectedReserved
      )
        throw new StockEditError("STOCK_CHANGED");
      if (input.stockOnHand < before.reserved)
        throw new StockEditError("STOCK_BELOW_RESERVED");
      const after = {
        ...before,
        stockOnHand: input.stockOnHand,
        enabled: input.enabled,
        version: before.version + 1,
      };
      await tx`UPDATE catalog_stock SET stock_on_hand=${after.stockOnHand},enabled=${after.enabled},version=${after.version} WHERE product_id=${product.id}`;
      await tx`INSERT INTO catalog_stock_change(id,product_id,fingerprint,before_stock,after_stock,reason,actor) VALUES(${input.mutationId},${product.id},${fingerprint},${tx.json(before)},${tx.json(after)},${input.reason},${actor})`;
      return after;
    });
  }
  async reserve(
    orderId: string,
    fingerprint: string,
    requested: ReservationItem[],
  ) {
    const items = requested
      .map(({ productId, quantity }) => ({ productId, quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
    if (
      !items.length ||
      items.length > 100 ||
      new Set(items.map((i) => i.productId)).size !== items.length ||
      items.some(
        (i) =>
          !i.productId ||
          !Number.isSafeInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 1000000,
      )
    )
      throw Error("INVALID_RESERVATION");
    const requestHash = hash({ fingerprint, items });
    await this.run(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${orderId},1542))`;
      const [previous] =
        await tx`SELECT * FROM catalog_reservation WHERE order_id=${orderId} FOR UPDATE`;
      if (previous) {
        if (previous.state !== "active") throw new ReservationClosed();
        if (previous.fingerprint !== requestHash)
          throw Error("RESERVATION_RETRY_CONFLICT");
        return;
      }
      // Stable ordering serializes concurrent last-unit purchases without deadlocks.
      const rows = await tx<
        (StockRow & {
          published: { price?: number } | null;
          archived: boolean;
        })[]
      >`SELECT s.*,e.published,e.archived FROM catalog_stock s JOIN catalog_entry e ON e.id=s.product_id WHERE s.product_id IN ${tx(items.map((i) => i.productId))} ORDER BY s.product_id FOR UPDATE OF e,s`;
      const byId = new Map(rows.map((r) => [r.product_id, r]));
      const missing = items
        .filter((i) => {
          const r = byId.get(i.productId);
          const price = requested.find(
            (p) => p.productId === i.productId,
          )?.unitPriceCents;
          return (
            !r ||
            !r.enabled ||
            !r.published ||
            r.archived ||
            r.stock_on_hand - r.reserved < i.quantity ||
            (price !== undefined &&
              Math.round(Number(r.published.price) * 100) !== price)
          );
        })
        .map((i) => i.productId);
      if (missing.length) throw new InventoryShortage(missing);
      for (const i of items)
        await tx`UPDATE catalog_stock SET reserved=reserved+${i.quantity},version=version+1 WHERE product_id=${i.productId}`;
      await tx`INSERT INTO catalog_reservation(order_id,fingerprint,items,state) VALUES(${orderId},${requestHash},${tx.json(items)},'active')`;
    });
  }
  async settle(
    orderId: string,
    state: "consumed" | "released",
  ): Promise<boolean> {
    return this.run(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${orderId},1542))`;
      const [reservation] =
        await tx`SELECT * FROM catalog_reservation WHERE order_id=${orderId} FOR UPDATE`;
      if (!reservation) {
        if (state === "consumed") return false;
        await tx`INSERT INTO catalog_reservation(order_id,fingerprint,items,state) VALUES(${orderId},'', '[]','released')`;
        return true;
      }
      if (reservation.state === state) return true;
      if (reservation.state !== "active") return false;
      const items = reservation.items as ReservationItem[];
      const rows = await tx<
        StockRow[]
      >`SELECT * FROM catalog_stock WHERE product_id IN ${tx(items.map((i) => i.productId))} ORDER BY product_id FOR UPDATE`;
      if (
        items.some(
          (i) =>
            !rows.some(
              (r) => r.product_id === i.productId && r.reserved >= i.quantity,
            ),
        )
      )
        throw Error("INVENTORY_INTEGRITY_ERROR");
      for (const i of items)
        await tx`UPDATE catalog_stock SET reserved=reserved-${i.quantity},stock_on_hand=stock_on_hand-${state === "consumed" ? i.quantity : 0},version=version+1 WHERE product_id=${i.productId}`;
      await tx`UPDATE catalog_reservation SET state=${state},updated_at=now() WHERE order_id=${orderId}`;
      return true;
    });
  }
}
