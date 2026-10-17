import { inventoryFixture } from "@/modules/inventory/testing/memory-documents";
const fi = inventoryFixture();
vi.mock("@/modules/inventory/infrastructure/sanity-documents", () => ({ inventoryStore: () => fi.inventory }));
import { vi } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import type { Sql } from "postgres";
import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import { createDatabaseClient } from "../../../db/client";
import { runMigrations } from "../../../db/migrate";
import { PostgresCheckoutRepository } from "../../checkout/infrastructure/postgres/checkout-repository";
import { CheckoutAttemptChangedError, CheckoutInventoryUnavailableError } from "../../checkout/domain/checkout";
import { testDelivery } from "../../checkout/domain/delivery.test-fixture";
import { PostgresAdminOrderReader } from "../../admin/infrastructure/postgres-order-reader";
import { quoteFixture, destination } from "../testing/fixtures";
import { consumeShippingQuoteBudget } from "./server/rate-limit";

const url=process.env.TEST_DATABASE_URL;
if (process.env.RUN_DB_INTEGRATION === "1" && !url) throw new Error("TEST_DATABASE_URL required");
if (url && !["localhost","127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Shipping integration tests require a local disposable database");
(url?describe:describe.skip)("shipping persistence in PostgreSQL",()=>{
  let sql:Sql;
  beforeAll(async()=>{sql=createDatabaseClient(url!);await runMigrations(sql);});
  afterAll(async()=>{await sql?.end();});
  beforeEach(async()=>{ fi.documents.data.clear();await sql`TRUNCATE orders, inventory_item, shipping_quote_rate_limit RESTART IDENTITY CASCADE`;fi.documents.seed("piece", 2);});
  async function input(){ const {snapshot}=await quoteFixture(); const id=randomUUID();return {orderId:id,publicTokenHash:createHash("sha256").update(id).digest("hex"),idempotencyKey:randomUUID(),buyerEmail:"test@example.com",delivery:{...testDelivery,...destination},currency:"ARS" as const,shippingCents:snapshot.amountCents,shippingSnapshot:snapshot,items:[{productId:"piece",name:"Pieza",unitPriceCents:1500000,quantity:2}]}; }
  it("persists the selection atomically, reuses identical attempts and rejects carrier changes",async()=>{
    const repository=new PostgresCheckoutRepository(sql); const data=await input();
    await repository.reserve(data); expect((await repository.reserve(data)).reused).toBe(true);
    const [row]=await sql`SELECT shipping_quote_snapshot FROM orders WHERE id=${data.orderId}`;
    expect(row.shipping_quote_snapshot).toEqual(data.shippingSnapshot);
    const [inventory]=[await fi.stock("piece")];expect(inventory.reserved).toBe(2);
    await expect(repository.reserve({...data,shippingSnapshot:{...data.shippingSnapshot,carrierId:233}})).rejects.toBeInstanceOf(CheckoutAttemptChangedError);
    expect((await new PostgresAdminOrderReader(sql).get(data.orderId))?.deliveryMethod).toContain("OCA");
  });
  it("retains only an unready intent when stock cannot be reserved",async()=>{
    const data=await input();fi.documents.seed("piece",0);
    await expect(new PostgresCheckoutRepository(sql).reserve(data)).rejects.toBeInstanceOf(CheckoutInventoryUnavailableError);
    const [row]=await sql`SELECT count(*)::int AS count FROM orders`;expect(row.count).toBe(1);
    expect(await sql`SELECT inventory_state FROM orders`).toMatchObject([{inventory_state:"pending"}]);
  });
  it("enforces a shared account budget under concurrent calls and resets the next minute",async()=>{
    const results=await Promise.allSettled(Array.from({length:65},()=>consumeShippingQuoteBudget(sql)));
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(60);
    expect(results.filter(r=>r.status==="rejected")).toHaveLength(5);
    await sql`UPDATE shipping_quote_rate_limit SET window_start=now()-interval '2 minutes'`;
    await expect(consumeShippingQuoteBudget(sql)).resolves.toBeUndefined();
  });
});
