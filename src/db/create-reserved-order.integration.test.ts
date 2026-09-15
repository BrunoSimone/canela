import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseClient } from "./client";
import {
  createReservedOrder,
  InventoryUnavailableError,
  type CreateReservedOrderInput,
} from "./create-reserved-order";
import { runMigrations } from "./migrate";

const connectionString = process.env.TEST_DATABASE_URL;

if (process.env.RUN_DB_INTEGRATION === "1" && !connectionString) {
  throw new Error("TEST_DATABASE_URL is required when RUN_DB_INTEGRATION=1");
}

const describeWithDatabase = connectionString ? describe : describe.skip;

function inputFor(productIds: string[]): CreateReservedOrderInput {
  const orderId = randomUUID();
  return {
    orderId,
    publicTokenHash: createHash("sha256").update(orderId).digest("hex"),
    idempotencyKey: randomUUID(),
    currency: "ARS",
    shippingCents: 0,
    items: productIds.map((productId) => ({
      productId,
      name: `Producto ${productId}`,
      unitPriceCents: 1_500_000,
      quantity: 1,
    })),
  };
}

describeWithDatabase("createReservedOrder against PostgreSQL", () => {
  let sql: Sql;

  beforeAll(async () => {
    sql = createDatabaseClient(connectionString!);
    await runMigrations(sql);
  });

  beforeEach(async () => {
    await sql`
      TRUNCATE TABLE
        processed_webhook,
        inventory_adjustment,
        payment_attempt,
        stock_reservation,
        order_item,
        orders,
        inventory_item
      RESTART IDENTITY CASCADE
    `;
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("lets exactly one concurrent checkout reserve the last unit", async () => {
    await sql`
      INSERT INTO inventory_item (product_id, stock_on_hand)
      VALUES ('unique-piece', 1)
    `;

    const outcomes = await Promise.allSettled([
      createReservedOrder(sql, inputFor(["unique-piece"])),
      createReservedOrder(sql, inputFor(["unique-piece"])),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected).toMatchObject({ reason: expect.any(InventoryUnavailableError) });

    const [inventory] = await sql<{
      stock_on_hand: number;
      reserved: number;
    }[]>`
      SELECT stock_on_hand, reserved
      FROM inventory_item
      WHERE product_id = 'unique-piece'
    `;
    const [{ order_count }] = await sql<{ order_count: number }[]>`
      SELECT count(*)::int AS order_count FROM orders
    `;

    expect(inventory).toEqual({ stock_on_hand: 1, reserved: 1 });
    expect(order_count).toBe(1);
  });

  it("rolls back the complete cart when one product has no stock", async () => {
    await sql`
      INSERT INTO inventory_item (product_id, stock_on_hand)
      VALUES ('available-piece', 1), ('sold-piece', 0)
    `;

    await expect(
      createReservedOrder(
        sql,
        inputFor(["available-piece", "sold-piece"]),
      ),
    ).rejects.toMatchObject({
      productIds: ["sold-piece"],
    });

    const inventory = await sql<{
      product_id: string;
      reserved: number;
    }[]>`
      SELECT product_id, reserved
      FROM inventory_item
      ORDER BY product_id
    `;
    const [{ order_count }] = await sql<{ order_count: number }[]>`
      SELECT count(*)::int AS order_count FROM orders
    `;

    expect(inventory).toEqual([
      { product_id: "available-piece", reserved: 0 },
      { product_id: "sold-piece", reserved: 0 },
    ]);
    expect(order_count).toBe(0);
  });

  it("reuses an existing order for the same idempotency key", async () => {
    await sql`
      INSERT INTO inventory_item (product_id, stock_on_hand)
      VALUES ('repeatable-piece', 1)
    `;
    const input = inputFor(["repeatable-piece"]);

    const first = await createReservedOrder(sql, input);
    const second = await createReservedOrder(sql, {
      ...input,
      orderId: randomUUID(),
      publicTokenHash: "b".repeat(64),
    });

    expect(first.reused).toBe(false);
    expect(second).toMatchObject({ orderId: first.orderId, reused: true });

    const [inventory] = await sql<{ reserved: number }[]>`
      SELECT reserved FROM inventory_item WHERE product_id = 'repeatable-piece'
    `;
    expect(inventory.reserved).toBe(1);
  });
});
