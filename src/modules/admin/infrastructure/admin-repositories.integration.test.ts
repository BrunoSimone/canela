import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabaseClient } from "../../../db/client";
import { runMigrations } from "../../../db/migrate";

import { AdminAuthRepository } from "./admin-auth";
import { PostgresAdminOrderReader } from "./postgres-order-reader";
import { PostgresOrderPreparationRepository, PreparationNotAllowedError, PreparationVersionConflictError } from "./postgres-preparation";

const connectionString = process.env.TEST_DATABASE_URL;
if (process.env.RUN_DB_INTEGRATION === "1" && !connectionString) {
  throw new Error("TEST_DATABASE_URL is required when RUN_DB_INTEGRATION=1");
}

const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase("admin repositories", () => {
  let sql: Sql;
  let priorAllowlist: string | undefined;

  beforeAll(async () => {
    priorAllowlist = process.env.ADMIN_ALLOWED_EMAILS;
    process.env.ADMIN_ALLOWED_EMAILS = "owner@example.com";
    sql = createDatabaseClient(connectionString!);
    await runMigrations(sql);
  });

  beforeEach(async () => {
    await sql`
      TRUNCATE TABLE admin_auth_event, admin_session, admin_login_link,
        admin_login_rate_limit, processed_webhook, inventory_adjustment,
        payment_attempt, stock_reservation, order_item, orders, inventory_item
      RESTART IDENTITY CASCADE
    `;
  });

  afterAll(async () => {
    if (priorAllowlist === undefined) delete process.env.ADMIN_ALLOWED_EMAILS;
    else process.env.ADMIN_ALLOWED_EMAILS = priorAllowlist;
    await sql?.end();
  });

  it("allows one-time links only for allowlisted email and revokes sessions", async () => {
    const auth = new AdminAuthRepository(sql);
    expect(await auth.issueLink("stranger@example.com")).toBeNull();
    const link = await auth.issueLink("OWNER@example.com");
    expect(link).toBeTruthy();
    const consumed = await auth.consumeLink(link!);
    expect(consumed?.email).toBe("owner@example.com");
    expect(await auth.consumeLink(link!)).toBeNull();
    expect(await auth.getSession(consumed?.session)).toEqual({ email: "owner@example.com" });
    await auth.revokeSession(consumed?.session);
    expect(await auth.getSession(consumed?.session)).toBeNull();
  });

  it("limits repeated link requests", async () => {
    const auth = new AdminAuthRepository(sql);
    for (let index = 0; index < 5; index++) {
      expect(await auth.issueLink("owner@example.com")).toBeTruthy();
    }
    expect(await auth.issueLink("owner@example.com")).toBeNull();
  });

  it("paginates ties and sub-millisecond timestamps without duplication", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const [index, id] of ids.entries()) {
      await sql`
        INSERT INTO orders (
          id, public_token_hash, checkout_idempotency_key, status, currency,
          subtotal_cents, total_cents, buyer_email, created_at
        ) VALUES (
          ${id}, ${createHash("sha256").update(id).digest("hex")}, ${randomUUID()},
          'paid', 'ARS', 10000, 10000, ${`buyer${index}@example.com`},
          ${index === 0 ? "2026-09-27T12:00:00.000001Z" : "2026-09-27T12:00:00.000002Z"}::timestamptz
        )
      `;
      await sql`
        INSERT INTO order_item (order_id, product_id, name_snapshot, unit_price_cents, quantity)
        VALUES (${id}, ${`piece-${index}`}, 'Fuente artesanal', 10000, 1)
      `;
    }
    const reader = new PostgresAdminOrderReader(sql);
    const first = await reader.list({ q: "", sort: "created_desc", cursor: null, limit: 1 });
    const second = await reader.list({ q: "", sort: "created_desc", cursor: first.nextCursor, limit: 1 });
    const third = await reader.list({ q: "", sort: "created_desc", cursor: second.nextCursor, limit: 1 });
    expect(new Set([first.orders[0].id, second.orders[0].id, third.orders[0].id]).size).toBe(3);
    expect(third.nextCursor).toBeNull();
    expect((await reader.list({ q: "buyer1", sort: "created_desc", cursor: null, limit: 25 })).orders[0].buyer.email)
      .toBe("buyer1@example.com");
  });

  it("reads the saved delivery and searches by buyer or recipient", async () => {
    const id = randomUUID();
    await sql`
      INSERT INTO orders (
        id, public_token_hash, checkout_idempotency_key, status, currency,
        subtotal_cents, total_cents, buyer_email
      ) VALUES (
        ${id}, ${createHash("sha256").update(id).digest("hex")}, ${randomUUID()},
        'paid', 'ARS', 10000, 10000, 'ana@example.com'
      )
    `;
    await sql`
      INSERT INTO order_delivery (
        order_id, buyer_name, recipient_name, recipient_phone, street_name,
        street_number, floor, apartment, city, province_code, postal_code
      ) VALUES (
        ${id}, 'Ana López', 'Martín Gómez', '1123456789', 'Calle 12',
        '430', '2', 'A', 'La Plata', 'B', '1900'
      )
    `;
    const reader = new PostgresAdminOrderReader(sql);
    const order = await reader.get(id);
    expect(order).toMatchObject({
      buyer: { name: "Ana López", email: "ana@example.com", phone: "1123456789" },
      recipientName: "Martín Gómez",
      destination: { locality: "La Plata", province: "Buenos Aires", postalCode: "1900" },
      shippingAddress: "Calle 12 430, piso 2, depto. A",
      deliveryMethod: "A domicilio",
    });
    for (const q of ["Ana López", "Martín Gómez"]) {
      const page = await reader.list({ q, sort: "created_desc", cursor: null, limit: 25 });
      expect(page.orders.map((item) => item.id)).toContain(id);
    }
  });

  it("saves and audits measured parcels only for a paid order", async () => {
    const id = randomUUID();
    await sql`
      INSERT INTO orders (id, public_token_hash, checkout_idempotency_key, status, currency, subtotal_cents, total_cents)
      VALUES (${id}, ${createHash("sha256").update(id).digest("hex")}, ${randomUUID()}, 'paid', 'ARS', 10000, 10000)
    `;
    const preparation = new PostgresOrderPreparationRepository(sql);
    const first = await preparation.save(id, "owner@example.com", {
      expectedVersion: 0,
      parcels: [{ weightGrams: 900, heightCm: 20, widthCm: 30, lengthCm: 40 }],
      note: "Frágil",
    });
    expect(first).toMatchObject({ version: 1, updatedBy: "owner@example.com" });
    await expect(preparation.save(id, "owner@example.com", {
      expectedVersion: 0,
      parcels: [{ weightGrams: 950, heightCm: 20, widthCm: 30, lengthCm: 40 }],
      note: null,
    })).rejects.toBeInstanceOf(PreparationVersionConflictError);
    const second = await preparation.save(id, "owner@example.com", {
      expectedVersion: 1,
      parcels: [{ weightGrams: 950, heightCm: 20, widthCm: 30, lengthCm: 40 }],
      note: null,
    });
    expect(second?.version).toBe(2);
    const read = await new PostgresAdminOrderReader(sql).get(id);
    expect(read).toMatchObject({
      status: "ready_to_ship",
      preparation: { version: 2, parcels: [{ weightGrams: 950, heightCm: 20, widthCm: 30, lengthCm: 40 }] },
    });
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM order_preparation_event WHERE order_id = ${id}
    `;
    expect(count).toBe(2);
    await sql`UPDATE orders SET status = 'refunded' WHERE id = ${id}`;
    await expect(preparation.save(id, "owner@example.com", {
      expectedVersion: 2,
      parcels: [{ weightGrams: 900, heightCm: 20, widthCm: 30, lengthCm: 40 }],
      note: null,
    })).rejects.toBeInstanceOf(PreparationNotAllowedError);
    expect((await new PostgresAdminOrderReader(sql).get(id))?.status).toBe("cancelled");
  });
});
