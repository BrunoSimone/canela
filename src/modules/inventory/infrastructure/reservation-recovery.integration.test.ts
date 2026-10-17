import { randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sql } from "postgres";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { createReservedOrder } from "@/db/create-reserved-order";
import { testDelivery } from "@/modules/checkout/domain/delivery.test-fixture";
import { inventoryFixture } from "../testing/memory-documents";
import { recoverReservationIntents } from "./recover-reservation-intents";
const url = process.env.TEST_DATABASE_URL;
if (url && !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw Error("Disposable local database required");
(url ? describe : describe.skip)("INV recovery between PostgreSQL and Sanity", () => {
  let sql: Sql;
  const f = inventoryFixture();
  const input = () => { const id = randomUUID(); return { orderId: id, publicTokenHash: createHash("sha256").update(id).digest("hex"), idempotencyKey: id, currency: "ARS" as const, shippingCents: 0, buyerEmail: "buyer@example.com", delivery: testDelivery, items: [{ productId: "piece", name: "Pieza", quantity: 1, unitPriceCents: 100 }] }; };
  beforeAll(async () => { sql = createDatabaseClient(url!); await runMigrations(sql); });
  beforeEach(async () => { await sql`TRUNCATE orders CASCADE`; f.documents.data.clear(); f.documents.seed("piece", 1); });
  afterAll(async () => { await sql?.end(); });
  it("keeps a durable intent after a lost Sanity reply and retries without a second reservation", async () => {
    const order = input(), commit = f.documents.commit.bind(f.documents);
    vi.spyOn(f.documents, "commit").mockImplementationOnce(async m => { await commit(m); throw Error("lost reply"); });
    await expect(createReservedOrder(sql, order, f.inventory)).rejects.toThrow("lost reply");
    expect(await sql`SELECT inventory_state FROM orders`).toMatchObject([{ inventory_state: "pending" }]);
    expect(await f.stock("piece")).toMatchObject({ reserved: 1 });
    await createReservedOrder(sql, { ...order, orderId: randomUUID() }, f.inventory);
    expect(await sql`SELECT inventory_state FROM orders`).toMatchObject([{ inventory_state: "ready" }]);
    expect(await f.stock("piece")).toMatchObject({ reserved: 1 });
  });
  it("recovers abandoned pre-payment reservations and refuses late retries", async () => {
    const order = input(), reserve = f.inventory.reserve.bind(f.inventory);
    vi.spyOn(f.inventory, "reserve").mockImplementationOnce(async (...args) => { await reserve(...args); throw Error("crash after reserve"); });
    await expect(createReservedOrder(sql, order, f.inventory)).rejects.toThrow();
    await sql`UPDATE orders SET inventory_expires_at=now()-interval '1 minute'`;
    expect(await recoverReservationIntents(sql, f.inventory)).toBe(1);
    expect(await recoverReservationIntents(sql, f.inventory)).toBe(0);
    expect(await f.stock("piece")).toMatchObject({ reserved: 0, stockOnHand: 1 });
    await expect(createReservedOrder(sql, order, f.inventory)).rejects.toThrow();
    await expect(f.inventory.reserve(order.orderId, "late", [{ productId: "piece", quantity: 1 }])).rejects.toThrow();
  });
  it("never cancels a ready reservation because its checkout clock elapsed", async () => {
    await createReservedOrder(sql, input(), f.inventory);
    await sql`UPDATE orders SET inventory_expires_at=now()-interval '1 day'`;
    expect(await recoverReservationIntents(sql, f.inventory)).toBe(0);
    expect(await f.stock("piece")).toMatchObject({ reserved: 1 });
  });
});
