import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createReservedOrder } from "../../../../db/create-reserved-order";
import { createDatabaseClient } from "../../../../db/client";
import { runMigrations } from "../../../../db/migrate";
import { PostgresPaymentConfirmationRepository } from "./payment-confirmation-repository";

const connectionString = process.env.TEST_DATABASE_URL;

if (process.env.RUN_DB_INTEGRATION === "1" && !connectionString) {
  throw new Error("TEST_DATABASE_URL is required when RUN_DB_INTEGRATION=1");
}

const describeWithDatabase = connectionString ? describe : describe.skip;
const providerOrderId = "ORDTST01CONFIRM";

describeWithDatabase("PostgresPaymentConfirmationRepository", () => {
  let sql: Sql;
  let repository: PostgresPaymentConfirmationRepository;

  beforeAll(async () => {
    sql = createDatabaseClient(connectionString!);
    await runMigrations(sql);
    repository = new PostgresPaymentConfirmationRepository(sql);
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

  it("finds the immutable order snapshot by provider order id", async () => {
    const orderId = await createCheckout(sql);

    await expect(
      repository.findByProviderOrderId(providerOrderId),
    ).resolves.toEqual({
      orderId,
      providerOrderId,
      totalCents: 3_400_000,
      currency: "ARS",
    });
    await expect(
      repository.findByProviderOrderId("ORD-UNKNOWN"),
    ).resolves.toBeNull();
  });

  it("finds the immutable order snapshot by public token hash", async () => {
    const orderId = await createCheckout(sql);
    const tokenHash = createHash("sha256").update(orderId).digest("hex");

    await expect(repository.findByPublicTokenHash(tokenHash)).resolves.toEqual({
      orderId,
      providerOrderId,
      totalCents: 3_400_000,
      currency: "ARS",
    });
    await expect(
      repository.findByPublicTokenHash("f".repeat(64)),
    ).resolves.toBeNull();
  });

  it("reconciles without persisting a fictitious webhook delivery", async () => {
    const orderId = await createCheckout(sql);

    await repository.apply({
      ...confirmation(orderId, "unused", "approved"),
      webhookDeliveryId: null,
    });

    const [{ count }] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM processed_webhook
    `;
    expect(count).toBe("0");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
      adjustments: 1,
    });
  });

  it("consumes stock once when webhook and return reconciliation race", async () => {
    const orderId = await createCheckout(sql);
    const webhook = confirmation(orderId, "delivery-race", "approved");
    const reconciliation = { ...webhook, webhookDeliveryId: null };

    const results = await Promise.all([
      repository.apply(webhook),
      repository.apply(reconciliation),
    ]);

    expect(results.map((result) => result.kind).sort()).toEqual([
      "applied",
      "unchanged",
    ]);
    const [{ deliveries }] = await sql<{ deliveries: string }[]>`
      SELECT count(*)::text AS deliveries FROM processed_webhook
    `;
    expect(deliveries).toBe("1");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
      adjustments: 1,
    });
  });

  it("consumes an approved reservation exactly once under concurrent deliveries", async () => {
    const orderId = await createCheckout(sql);

    const results = await Promise.all([
      repository.apply(confirmation(orderId, "delivery-a", "approved")),
      repository.apply(confirmation(orderId, "delivery-b", "approved")),
    ]);

    expect(results.map((result) => result.kind).sort()).toEqual([
      "applied",
      "unchanged",
    ]);
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      paymentStatus: "approved",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
      adjustments: 1,
    });
  });

  it("keeps the reservation for a processing payment", async () => {
    const orderId = await createCheckout(sql);

    await repository.apply(confirmation(orderId, "delivery-processing", "processing"));

    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "payment_pending",
      paymentStatus: "payment_pending",
      reservationStatus: "active",
      stockOnHand: 1,
      reserved: 1,
      adjustments: 0,
    });
  });

  it("does not release an elapsed reservation while the provider is processing", async () => {
    const orderId = await createCheckout(sql);
    await expireReservation(sql, orderId);

    await repository.apply(
      confirmation(orderId, "delivery-elapsed-processing", "processing"),
    );

    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "payment_pending",
      paymentStatus: "payment_pending",
      reservationStatus: "active",
      stockOnHand: 1,
      reserved: 1,
      adjustments: 0,
    });
  });

  it("consumes a late approved payment after the local window elapsed", async () => {
    const orderId = await createCheckout(sql);
    await expireReservation(sql, orderId);

    await repository.apply(
      confirmation(orderId, "delivery-late-approved", "approved"),
    );

    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      paymentStatus: "approved",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
      adjustments: 1,
    });
  });

  it("releases an elapsed reservation only after provider-confirmed expiration", async () => {
    const orderId = await createCheckout(sql);
    await expireReservation(sql, orderId);

    const result = await repository.apply(
      confirmation(orderId, "delivery-expired", "expired"),
    );

    expect(result.kind).toBe("applied");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "expired",
      paymentStatus: "expired",
      reservationStatus: "released",
      stockOnHand: 1,
      reserved: 0,
      adjustments: 0,
    });
  });

  it("releases a verified terminal failure once", async () => {
    const orderId = await createCheckout(sql);
    const event = confirmation(orderId, "delivery-failed", "rejected");

    const first = await repository.apply(event);
    const duplicate = await repository.apply(event);

    expect(first.kind).toBe("applied");
    expect(duplicate.kind).toBe("duplicate");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "rejected",
      paymentStatus: "rejected",
      reservationStatus: "released",
      stockOnHand: 1,
      reserved: 0,
    });
  });

  it("does not regress an approved sale when a late negative event arrives", async () => {
    const orderId = await createCheckout(sql);
    await repository.apply(confirmation(orderId, "delivery-approved", "approved"));

    const result = await repository.apply(
      confirmation(orderId, "delivery-late-negative", "rejected"),
    );

    expect(result.kind).toBe("unchanged");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      paymentStatus: "approved",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
      adjustments: 1,
    });
  });

  it("rolls back deduplication and stock when persistence fails", async () => {
    const orderId = await createCheckout(sql);
    const event = confirmation(orderId, "delivery-retry", "approved");

    await sql.unsafe(`
      CREATE FUNCTION test_fail_paid_order() RETURNS trigger AS $$
      BEGIN
        IF NEW.status = 'paid' THEN
          RAISE EXCEPTION 'simulated persistence failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER test_fail_paid_order_trigger
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION test_fail_paid_order();
    `);

    try {
      await expect(repository.apply(event)).rejects.toThrow(
        "simulated persistence failure",
      );
    } finally {
      await sql.unsafe(`
        DROP TRIGGER test_fail_paid_order_trigger ON orders;
        DROP FUNCTION test_fail_paid_order();
      `);
    }

    await expect(repository.apply(event)).resolves.toEqual({ kind: "applied" });
    const [{ count }] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count
      FROM processed_webhook
      WHERE provider = 'mercado_pago' AND event_id = 'delivery-retry'
    `;
    expect(count).toBe("1");
    await expect(readState(sql, orderId)).resolves.toMatchObject({
      orderStatus: "paid",
      reservationStatus: "consumed",
      stockOnHand: 0,
      reserved: 0,
    });
  });
});

async function createCheckout(sql: Sql): Promise<string> {
  const orderId = randomUUID();
  await createReservedOrder(sql, {
    orderId,
    publicTokenHash: createHash("sha256").update(orderId).digest("hex"),
    idempotencyKey: randomUUID(),
    buyerEmail: "buyer@example.com",
    currency: "ARS",
    shippingCents: 400_000,
    items: [
      {
        productId: "unique-piece",
        name: "Pieza única",
        unitPriceCents: 3_000_000,
        quantity: 1,
      },
    ],
  });
  await sql`
    UPDATE payment_attempt
    SET
      provider_order_id = ${providerOrderId},
      checkout_url = 'https://www.mercadopago.com.ar/checkout/redirect',
      provider_status = 'created',
      status = 'payment_pending'
    WHERE order_id = ${orderId}
  `;
  await sql`
    UPDATE orders SET status = 'payment_pending' WHERE id = ${orderId}
  `;
  return orderId;
}

async function expireReservation(sql: Sql, orderId: string): Promise<void> {
  await sql`
    UPDATE stock_reservation
    SET expires_at = now() - interval '1 minute'
    WHERE order_id = ${orderId}
  `;
}

function confirmation(
  orderId: string,
  deliveryId: string,
  state:
    | "approved"
    | "processing"
    | "rejected"
    | "cancelled"
    | "expired"
    | "review_required",
) {
  return {
    webhookDeliveryId: deliveryId,
    orderId,
    providerOrderId,
    providerStatus: state === "approved" ? "processed" : state,
    providerStatusDetail: state === "approved" ? "accredited" : null,
    state,
  } as const;
}

async function readState(sql: Sql, orderId: string) {
  const [row] = await sql<{
    order_status: string;
    payment_status: string;
    reservation_status: string;
    stock_on_hand: number;
    reserved: number;
    adjustments: string;
  }[]>`
    SELECT
      orders.status AS order_status,
      payment_attempt.status AS payment_status,
      stock_reservation.status AS reservation_status,
      inventory_item.stock_on_hand,
      inventory_item.reserved,
      (
        SELECT count(*)::text
        FROM inventory_adjustment
        WHERE product_id = inventory_item.product_id
      ) AS adjustments
    FROM orders
    JOIN payment_attempt ON payment_attempt.order_id = orders.id
    JOIN stock_reservation ON stock_reservation.order_id = orders.id
    JOIN inventory_item
      ON inventory_item.product_id = stock_reservation.product_id
    WHERE orders.id = ${orderId}
  `;

  return {
    orderStatus: row.order_status,
    paymentStatus: row.payment_status,
    reservationStatus: row.reservation_status,
    stockOnHand: row.stock_on_hand,
    reserved: row.reserved,
    adjustments: Number(row.adjustments),
  };
}
