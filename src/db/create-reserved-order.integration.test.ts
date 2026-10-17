import { inventoryFixture } from "@/modules/inventory/testing/memory-documents";
const fi = inventoryFixture();
vi.mock("@/modules/inventory/infrastructure/sanity-documents", () => ({ inventoryStore: () => fi.inventory }));
import { vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseClient } from "./client";
import {
  createReservedOrder,
  ChangedCheckoutAttemptError,
  InventoryUnavailableError,
  type CreateReservedOrderInput,
} from "./create-reserved-order";
import { runMigrations } from "./migrate";
import { testDelivery } from "../modules/checkout/domain/delivery.test-fixture";

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
    buyerEmail: "buyer@example.com",
    delivery: testDelivery,
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

  beforeEach(async () => { fi.documents.data.clear();
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
    fi.documents.seed("unique-piece", 1);

    const outcomes = await Promise.allSettled([
      createReservedOrder(sql, inputFor(["unique-piece"])),
      createReservedOrder(sql, inputFor(["unique-piece"])),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected).toMatchObject({ reason: expect.any(InventoryUnavailableError) });

    const inventory = await fi.stock("unique-piece");
    const [{ order_count }] = await sql<{ order_count: number }[]>`
      SELECT count(*)::int AS order_count FROM orders
    `;

    expect(inventory).toMatchObject({ stockOnHand: 1, reserved: 1 });
    expect(order_count).toBe(2);
  });

  it("rolls back the complete cart when one product has no stock", async () => {
    fi.documents.seed("available-piece",1); fi.documents.seed("sold-piece",0);

    await expect(
      createReservedOrder(
        sql,
        inputFor(["available-piece", "sold-piece"]),
      ),
    ).rejects.toMatchObject({
      productIds: ["sold-piece"],
    });

    const inventory = await Promise.all([fi.stock("available-piece"), fi.stock("sold-piece")]);
    const [{ order_count }] = await sql<{ order_count: number }[]>`
      SELECT count(*)::int AS order_count FROM orders
    `;

    expect(inventory).toMatchObject([
      { id: "available-piece", reserved: 0 },
      { id: "sold-piece", reserved: 0 },
    ]);
    expect(order_count).toBe(1); // durable pre-payment intent; worker cancels it if abandoned
  });

  it("reuses an existing order for the same idempotency key", async () => {
    fi.documents.seed("repeatable-piece", 1);
    const input = inputFor(["repeatable-piece"]);

    const first = await createReservedOrder(sql, input);
    const second = await createReservedOrder(sql, {
      ...input,
      orderId: randomUUID(),
      publicTokenHash: "b".repeat(64),
    });

    expect(first.reused).toBe(false);
    expect(second).toMatchObject({ orderId: first.orderId, reused: true });

    const [inventory] = [await fi.stock("repeatable-piece")];
    expect(inventory.reserved).toBe(1);

    await expect(createReservedOrder(sql, {
      ...input,
      orderId: randomUUID(),
      delivery: { ...input.delivery, postalCode: "1425" },
    })).rejects.toBeInstanceOf(ChangedCheckoutAttemptError);
    const [{ order_count }] = await sql<{ order_count: number }[]>`
      SELECT count(*)::int AS order_count FROM orders
    `;
    expect(order_count).toBe(1);
  });

  it("stores one Mercado Pago Orders identity per provider", async () => {
    const firstOrder = inputFor([]);
    const secondOrder = inputFor([]);

    for (const input of [firstOrder, secondOrder]) {
      await sql`
        INSERT INTO orders (
          id,
          public_token_hash,
          checkout_idempotency_key,
          currency,
          subtotal_cents,
          total_cents
        )
        VALUES (
          ${input.orderId},
          ${input.publicTokenHash},
          ${input.idempotencyKey},
          'ARS',
          0,
          0
        )
      `;
    }

    const providerIdempotencyKey = randomUUID();
    await sql`
      INSERT INTO payment_attempt (
        id,
        order_id,
        provider_idempotency_key,
        provider_order_id,
        checkout_url,
        provider_status,
        provider_status_detail
      )
      VALUES (
        ${randomUUID()},
        ${firstOrder.orderId},
        ${providerIdempotencyKey},
        'ORDTST01ABC',
        'https://www.mercadopago.com.ar/checkout/redirect',
        'created',
        'pending'
      )
    `;

    const [attempt] = await sql<{
      status: string;
      provider_order_id: string;
      provider_status_detail: string;
    }[]>`
      SELECT status, provider_order_id, provider_status_detail
      FROM payment_attempt
      WHERE order_id = ${firstOrder.orderId}
    `;

    expect(attempt).toEqual({
      status: "payment_pending",
      provider_order_id: "ORDTST01ABC",
      provider_status_detail: "pending",
    });

    await expect(
      sql`
        INSERT INTO payment_attempt (
          id,
          order_id,
          provider_idempotency_key
        )
        VALUES (
          ${randomUUID()},
          ${secondOrder.orderId},
          ${providerIdempotencyKey}
        )
      `,
    ).rejects.toMatchObject({ code: "23505" });
  });
});
