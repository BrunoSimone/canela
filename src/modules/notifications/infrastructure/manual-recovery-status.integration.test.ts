import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { createReservedOrder } from "@/db/create-reserved-order";
import { testDelivery } from "@/modules/checkout/domain/delivery.test-fixture";
import { inventoryFixture } from "@/modules/inventory/testing/memory-documents";
import type { CommerceEnvironment } from "../domain/notification";
import { readManualRecoveryStatus } from "./manual-recovery-status";

const url = process.env.TEST_DATABASE_URL;
if (process.env.RUN_DB_INTEGRATION === "1" && !url) throw Error("TEST_DATABASE_URL required");
if (url && !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw Error("Disposable local DB only");

(url ? describe : describe.skip)("MAN-03 manual recovery readiness", () => {
  let sql: Sql;
  const fixture = inventoryFixture();
  beforeAll(async () => { sql = createDatabaseClient(url!); await runMigrations(sql); });
  beforeEach(async () => {
    await sql`TRUNCATE orders, background_job_health CASCADE`;
    fixture.documents.data.clear();
    fixture.documents.seed("piece", 20);
  });
  afterAll(async () => { await sql?.end(); });

  async function seed(environment: CommerceEnvironment = "test") {
    const id = randomUUID();
    await createReservedOrder(sql, {
      orderId: id, publicTokenHash: createHash("sha256").update(id).digest("hex"),
      idempotencyKey: id, environment, currency: "ARS", shippingCents: 0,
      buyerEmail: "buyer@example.com", delivery: testDelivery,
      items: [{ productId: "piece", name: "Pieza", quantity: 1, unitPriceCents: 100 }],
    }, fixture.inventory);
    return id;
  }

  it("accepts a clean queue without a run or despite stale unhealthy run history", async () => {
    expect(await readManualRecoveryStatus(sql, "test")).toEqual({ review: 0, overdue: 0, expiredReservations: 0 });
    await sql`INSERT INTO background_job_health(name,finished_at,processed,review_count,overdue_count)
      VALUES('order_notifications', now()-interval '3 days', 0, 2, 3)`;
    expect(await readManualRecoveryStatus(sql, "test")).toEqual({ review: 0, overdue: 0, expiredReservations: 0 });
  });

  it("counts actual review/overdue notices in the selected environment, ignoring recent and sent ones", async () => {
    for (const [state, age, environment] of [
      ["review", "0 minutes", "test"], ["pending", "2 hours", "test"],
      ["sending", "2 hours", "test"], ["pending", "5 minutes", "test"],
      ["sent", "2 days", "test"], ["review", "2 hours", "production"],
      ["pending", "2 hours", "production"],
    ] as const) {
      const orderId = await seed(environment);
      await sql`INSERT INTO order_notification(id,order_id,kind,environment,state,created_at)
        VALUES(${randomUUID()},${orderId},'owner_paid',${environment},${state},now()-${age}::interval)`;
    }
    expect(await readManualRecoveryStatus(sql, "test")).toEqual({ review: 1, overdue: 2, expiredReservations: 0 });
    expect(await readManualRecoveryStatus(sql, "production")).toEqual({ review: 1, overdue: 1, expiredReservations: 0 });
  });

  it("only flags expired pre-payment intents, preserving ready, live-payment and other-environment reservations", async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, (_, i) => seed(i === 4 ? "production" : "test")));
    await sql`UPDATE orders SET inventory_state='pending', inventory_expires_at=now()-interval '1 minute'`;
    await sql`UPDATE orders SET inventory_state='ready' WHERE id=${ids[1]}`;
    await sql`UPDATE payment_attempt SET status='payment_pending',provider_order_id='MP-EXISTS',checkout_url='https://www.mercadopago.com.ar/checkout/test' WHERE order_id=${ids[2]}`;
    await sql`UPDATE orders SET inventory_expires_at=now()+interval '1 hour' WHERE id=${ids[3]}`;
    expect(await readManualRecoveryStatus(sql, "test")).toEqual({ review: 0, overdue: 0, expiredReservations: 1 });
    expect(await readManualRecoveryStatus(sql, "production")).toEqual({ review: 0, overdue: 0, expiredReservations: 1 });
    expect(await sql`SELECT status FROM stock_reservation`).toHaveLength(5);
    expect((await fixture.stock("piece")).reserved).toBe(5);
  });
});
