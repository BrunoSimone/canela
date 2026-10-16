import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Sql } from "postgres";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { StockRepository } from "./stock-repository";
import type { StockEdit } from "../../domain/stock-edit";
const url = process.env.TEST_DATABASE_URL;
if (url && !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw Error("Local test DB required");
(url ? describe : describe.skip)("inventory edits", () => {
  let sql: Sql, repo: StockRepository;
  const product = { id: "piece", name: "Pieza", tone: "stock" as const, price: 100 };
  const edit = (extra = {}): StockEdit => ({ mutationId: randomUUID(), expectedVersion: 0, expectedStock: 0, expectedReserved: 0, stockOnHand: 4, enabled: true, reason: "Carga inicial", ...extra });
  beforeAll(async () => { sql = createDatabaseClient(url!); await sql`SET client_min_messages TO warning`; await runMigrations(sql); repo = new StockRepository(sql); });
  beforeEach(async () => { await sql`TRUNCATE inventory_item CASCADE`; });
  afterAll(async () => { await sql?.end(); });
  it("creates stock and audits who changed it", async () => {
    expect(await repo.save(product, edit(), "owner@example.com")).toMatchObject({ stockOnHand: 4, reserved: 0, version: 1, enabled: true });
    expect(await repo.history(product.id)).toMatchObject([{ actor: "owner@example.com", reason: "Carga inicial" }]);
    expect(await repo.list([product])).toMatchObject([{ name: "Pieza", stockOnHand: 4 }]);
  });
  it("deduplicates concurrent retries and rejects changed payloads", async () => {
    const input = edit(); const results = await Promise.all([repo.save(product, input, "owner"), repo.save(product, input, "owner")]);
    expect(results[0]).toEqual(results[1]); expect(await sql`SELECT * FROM inventory_change`).toHaveLength(1);
    await expect(repo.save(product, { ...input, stockOnHand: 8 }, "owner")).rejects.toThrow("STOCK_RETRY_CONFLICT");
  });
  it("rejects concurrent edits instead of overwriting stock", async () => {
    const results = await Promise.allSettled([repo.save(product, edit(), "owner"), repo.save(product, edit(), "owner")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  });
  it("detects payments/reservations since the screen was loaded", async () => {
    await repo.save(product, edit(), "owner");
    await sql`UPDATE inventory_item SET stock_on_hand=3,reserved=1 WHERE product_id='piece'`;
    await expect(repo.save(product, edit({ expectedVersion: 1, expectedStock: 4 }), "owner")).rejects.toThrow("STOCK_CHANGED");
    await expect(repo.save(product, edit({ expectedVersion: 1, expectedStock: 3, expectedReserved: 1, stockOnHand: 0 }), "owner")).rejects.toThrow("STOCK_BELOW_RESERVED");
  });
  it("enforces unique pieces, made to order and sale-toggle audit", async () => {
    await expect(repo.save({ ...product, tone: "unica" }, edit(), "owner")).rejects.toThrow("UNIQUE_PIECE_LIMIT");
    await expect(repo.save({ ...product, tone: "encargo" }, edit(), "owner")).rejects.toThrow("MADE_TO_ORDER_NOT_SELLABLE");
    await repo.save(product, edit({ stockOnHand: 0 }), "owner");
    expect(await sql`SELECT * FROM inventory_adjustment`).toHaveLength(0);
    expect(await repo.history(product.id)).toHaveLength(1);
  });
});
