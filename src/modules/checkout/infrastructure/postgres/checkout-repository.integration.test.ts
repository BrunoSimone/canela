import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabaseClient } from "../../../../db/client";
import { runMigrations } from "../../../../db/migrate";
import type { PaymentOrder } from "../../../payments/domain/payment-order";
import { PostgresCheckoutRepository } from "./checkout-repository";

const connectionString = process.env.TEST_DATABASE_URL;

if (process.env.RUN_DB_INTEGRATION === "1" && !connectionString) {
  throw new Error("TEST_DATABASE_URL is required when RUN_DB_INTEGRATION=1");
}

const describeWithDatabase = connectionString ? describe : describe.skip;

function reserveInput() {
  const orderId = randomUUID();
  return {
    orderId,
    publicTokenHash: createHash("sha256").update(orderId).digest("hex"),
    idempotencyKey: randomUUID(),
    buyerEmail: "buyer@example.com",
    currency: "ARS" as const,
    shippingCents: 400_000,
    items: [
      {
        productId: "unique-piece",
        name: "Pieza única",
        unitPriceCents: 3_000_000,
        quantity: 1,
      },
    ],
  };
}

function providerOrder(orderId: string): PaymentOrder {
  return {
    providerOrderId: "ORDTST01ABC",
    externalReference: orderId,
    state: "created",
    providerStatus: "created",
    providerStatusDetail: null,
    totalCents: 3_400_000,
    currency: "ARS",
    checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
  };
}

describeWithDatabase("PostgresCheckoutRepository", () => {
  let sql: Sql;
  let repository: PostgresCheckoutRepository;

  beforeAll(async () => {
    sql = createDatabaseClient(connectionString!);
    await runMigrations(sql);
    repository = new PostgresCheckoutRepository(sql);
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
    await sql`
      INSERT INTO inventory_item (product_id, stock_on_hand)
      VALUES ('unique-piece', 1)
    `;
  });

  afterAll(async () => {
    await sql?.end();
  });

  it("creates the reservation and payment attempt atomically", async () => {
    const input = reserveInput();

    const checkout = await repository.reserve(input);
    const [attempt] = await sql<{
      provider_idempotency_key: string;
      status: string;
    }[]>`
      SELECT provider_idempotency_key, status
      FROM payment_attempt
      WHERE order_id = ${input.orderId}
    `;

    expect(checkout).toMatchObject({
      orderId: input.orderId,
      totalCents: 3_400_000,
      providerIdempotencyKey: input.idempotencyKey,
      providerOrderId: null,
      checkoutUrl: null,
      reused: false,
    });
    expect(attempt).toEqual({
      provider_idempotency_key: input.idempotencyKey,
      status: "payment_pending",
    });
  });

  it("returns the frozen checkout after persisting the provider order", async () => {
    const input = reserveInput();
    await repository.reserve(input);
    await repository.saveProviderOrder(input.orderId, providerOrder(input.orderId));

    const retried = await repository.reserve({
      ...input,
      orderId: randomUUID(),
      buyerEmail: "changed@example.com",
      shippingCents: 1,
      items: [{ ...input.items[0], name: "Nombre cambiado" }],
    });

    expect(retried).toMatchObject({
      orderId: input.orderId,
      buyerEmail: input.buyerEmail,
      shippingCents: input.shippingCents,
      providerOrderId: "ORDTST01ABC",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      reused: true,
    });
    expect(retried.items).toEqual(input.items);
  });

  it("releases a definitive failure exactly once", async () => {
    const input = reserveInput();
    await repository.reserve(input);

    await repository.releaseForDefinitiveProviderFailure(input.orderId);
    await repository.releaseForDefinitiveProviderFailure(input.orderId);

    const [inventory] = await sql<{ reserved: number }[]>`
      SELECT reserved FROM inventory_item WHERE product_id = 'unique-piece'
    `;
    const [reservation] = await sql<{ status: string }[]>`
      SELECT status FROM stock_reservation WHERE order_id = ${input.orderId}
    `;
    const [order] = await sql<{ status: string }[]>`
      SELECT status FROM orders WHERE id = ${input.orderId}
    `;

    expect(inventory.reserved).toBe(0);
    expect(reservation.status).toBe("released");
    expect(order.status).toBe("rejected");
  });

  it("marks an uncertain result without releasing stock", async () => {
    const input = reserveInput();
    await repository.reserve(input);

    await repository.markProviderCreationUncertain(input.orderId);

    const [inventory] = await sql<{ reserved: number }[]>`
      SELECT reserved FROM inventory_item WHERE product_id = 'unique-piece'
    `;
    const [reservation] = await sql<{ status: string }[]>`
      SELECT status FROM stock_reservation WHERE order_id = ${input.orderId}
    `;
    const [order] = await sql<{ status: string }[]>`
      SELECT status FROM orders WHERE id = ${input.orderId}
    `;

    expect(inventory.reserved).toBe(1);
    expect(reservation.status).toBe("active");
    expect(order.status).toBe("review_required");
  });

  it("refuses to release stock after a provider order was persisted", async () => {
    const input = reserveInput();
    await repository.reserve(input);
    await repository.saveProviderOrder(input.orderId, providerOrder(input.orderId));

    await expect(
      repository.releaseForDefinitiveProviderFailure(input.orderId),
    ).rejects.toThrow("cannot be released");

    const [inventory] = await sql<{ reserved: number }[]>`
      SELECT reserved FROM inventory_item WHERE product_id = 'unique-piece'
    `;
    const [reservation] = await sql<{ status: string }[]>`
      SELECT status FROM stock_reservation WHERE order_id = ${input.orderId}
    `;

    expect(inventory.reserved).toBe(1);
    expect(reservation.status).toBe("active");
  });

  it("rejects a partially persisted provider identity", async () => {
    const input = reserveInput();
    await repository.reserve(input);

    await expect(
      sql`
        UPDATE payment_attempt
        SET provider_order_id = 'ORDTST01ABC'
        WHERE order_id = ${input.orderId}
      `,
    ).rejects.toMatchObject({ code: "23514" });
  });
});
