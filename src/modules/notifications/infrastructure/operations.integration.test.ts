import { inventoryFixture } from "@/modules/inventory/testing/memory-documents";
const fi = inventoryFixture();
vi.mock("@/modules/inventory/infrastructure/sanity-documents", () => ({ inventoryStore: () => fi.inventory }));
import { vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { createReservedOrder } from "@/db/create-reserved-order";
import { PostgresPaymentConfirmationRepository } from "@/modules/payments/infrastructure/postgres/payment-confirmation-repository";
import { PostgresOrderPreparationRepository } from "@/modules/admin/infrastructure/postgres-preparation";
import { PostgresShipmentRepository } from "@/modules/shipping/infrastructure/postgres-shipment-repository";
import { fulfillmentFixture } from "@/modules/shipping/testing/fulfillment-fixture";
import { PostgresDispatchRepository } from "@/modules/shipping/infrastructure/postgres-dispatch-repository";
import { PostgresAdminOrderReader } from "@/modules/admin/infrastructure/postgres-order-reader";
import { PostgresNotificationRepository } from "./postgres-notification-repository";

const url=process.env.TEST_DATABASE_URL;
if(process.env.RUN_DB_INTEGRATION==="1"&&!url) throw Error("TEST_DATABASE_URL required");
if(url&&!["localhost","127.0.0.1"].includes(new URL(url).hostname)) throw Error("Disposable local DB only");
(url?describe:describe.skip)("OPS transactional dispatch and notices",()=>{
  let sql:Sql;
  beforeAll(async()=>{sql=createDatabaseClient(url!);await sql`SET client_min_messages TO warning`;await runMigrations(sql);});
  afterAll(async()=>{await sql?.end();});
  beforeEach(async()=>{ fi.documents.data.clear();await sql`TRUNCATE orders,inventory_item,processed_webhook RESTART IDENTITY CASCADE`;});
  async function seed(paid=true,label=true){
    const f=await fulfillmentFixture(); const id=f.order.id;
    fi.documents.seed("piece", 1);
    await createReservedOrder(sql,{orderId:id,publicTokenHash:createHash("sha256").update(id).digest("hex"),idempotencyKey:randomUUID(),currency:"ARS",buyerEmail:f.order.buyerEmail,delivery:f.order.delivery!,shippingCents:f.order.shippingCents,shippingSnapshot:f.order.quote!,items:[{productId:"piece",name:"Pieza",quantity:1,unitPriceCents:f.order.subtotalCents}]});
    await sql`UPDATE payment_attempt SET status='payment_pending',provider_order_id='MP-OPS',checkout_url='https://www.mercadopago.com.ar/checkout/test' WHERE order_id=${id}`;
    const payment=new PostgresPaymentConfirmationRepository(sql);
    const approval={orderId:id,providerOrderId:"MP-OPS",webhookDeliveryId:"payment-event",state:"approved" as const,providerStatus:"processed",providerStatusDetail:"accredited"};
    if(paid) await payment.apply(approval);
    if(label){
      await new PostgresOrderPreparationRepository(sql).save(id,"owner@example.com",{expectedVersion:0,parcels:f.order.preparation!.parcels,note:null});
      const ships=new PostgresShipmentRepository(sql),order=(await ships.loadOrder(id))!;
      await ships.claim({...f.request,quote:order.quote!,delivery:order.delivery!},"owner@example.com",f.context);
      await ships.saveRemote(id,f.remote);await ships.saveLabel(id,Buffer.from("%PDF-test"));
    }
    return {...f,id,payment,approval,dispatch:new PostgresDispatchRepository(sql,f.context)};
  }
  it("OPS-03: enqueues exactly one owner notice with the verified payment and stock transition",async()=>{
    const f=await seed(false,false);
    await Promise.all([f.payment.apply(f.approval),f.payment.apply({...f.approval,webhookDeliveryId:"another"})]);
    expect(await sql`SELECT kind,state,environment FROM order_notification`).toMatchObject([{kind:"owner_paid",state:"pending",environment:"test"}]);
    expect([(await fi.stock("piece"))].map(s => ({stock_on_hand:s.stockOnHand,reserved:s.reserved}))).toMatchObject([{stock_on_hand:0,reserved:0}]);
  });
  it.each(["processing","rejected","review_required"] as const)("OPS-03: %s does not notify a sale",async state=>{
    const f=await seed(false,false);await f.payment.apply({...f.approval,state});
    expect(await sql`SELECT * FROM order_notification`).toHaveLength(0);
  });
  it("OPS-01/02: concurrent dispatch creates one audit and one buyer notice",async()=>{
    const f=await seed();
    const results=await Promise.all(Array.from({length:5},()=>f.dispatch.confirm(f.id,f.remote.id,"owner@example.com")));
    expect(results.every(r=>r.dispatchedAt===results[0].dispatchedAt)).toBe(true);
    expect(await sql`SELECT actor_email FROM order_dispatch`).toMatchObject([{actor_email:"owner@example.com"}]);
    expect(await sql`SELECT kind FROM order_notification ORDER BY kind`).toMatchObject([{kind:"buyer_shipped"},{kind:"owner_paid"}]);
    await f.payment.apply({...f.approval,webhookDeliveryId:"late"});
    expect(await sql`SELECT status FROM orders`).toMatchObject([{status:"shipped"}]);
    expect([...fi.documents.data.values()].filter(d => d._type === "canelaReservation" && d.state === "consumed")).toHaveLength(1);
  });
  it.each(["unpaid","no_label","wrong_id","context","tracking"])("OPS-01: blocks %s before dispatch or buyer notice",async kind=>{
    const f=await seed(kind!=="unpaid",kind!=="unpaid"&&kind!=="no_label");
    if(kind==="context")f.context.contextFingerprint="x";
    if(kind==="tracking")await sql`UPDATE order_shipment SET remote_summary=remote_summary || '{"trackingUrl":"javascript:alert(1)"}'::jsonb`;
    await expect(f.dispatch.confirm(f.id,kind==="wrong_id"?999999:f.remote.id,"owner@example.com")).rejects.toThrow();
    expect(await sql`SELECT * FROM order_dispatch`).toHaveLength(0);
    expect(await sql`SELECT * FROM order_notification WHERE kind='buyer_shipped'`).toHaveLength(0);
  });
  it("OPS-03: transaction rollback cannot leave a phantom owner notice",async()=>{
    const f=await seed(false,false);
    await sql`CREATE FUNCTION fail_notice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END; $$`;
    await sql`CREATE TRIGGER fail_notice BEFORE INSERT ON order_notification FOR EACH ROW EXECUTE FUNCTION fail_notice()`;
    try {
      await expect(f.payment.apply(f.approval)).rejects.toThrow();
      expect([(await fi.stock("piece"))].map(s => ({stock_on_hand:s.stockOnHand,reserved:s.reserved}))).toMatchObject([{stock_on_hand:0,reserved:0}]);
      expect(await sql`SELECT * FROM processed_webhook`).toHaveLength(0);
    } finally {await sql`DROP TRIGGER fail_notice ON order_notification`;await sql`DROP FUNCTION fail_notice()`;}
    await f.payment.apply(f.approval);
    expect(await sql`SELECT * FROM order_notification`).toHaveLength(1);
    expect(await fi.stock("piece")).toMatchObject({stockOnHand:0,reserved:0});
  });
  it("OPS-05: exclusive claims, lease recovery and stale acknowledgement",async()=>{
    await seed();const repo=new PostgresNotificationRepository(sql);
    const claims=await Promise.all(Array.from({length:5},()=>repo.claim("test")));
    const first=claims.find(Boolean)!;expect(claims.filter(Boolean)).toHaveLength(1);
    await sql`UPDATE order_notification SET lease_until=now()-interval '1 second'`;
    const next=(await repo.claim("test"))!;expect(next.leaseToken).not.toBe(first.leaseToken);
    await repo.sent(first,"stale");expect(await sql`SELECT state FROM order_notification`).toMatchObject([{state:"sending"}]);
    await repo.sent(next,"accepted");expect(await sql`SELECT state FROM order_notification`).toMatchObject([{state:"sent"}]);
    expect(await repo.claim("test")).toBeNull();
  });
  it("OPS-05/07: never claims another environment or retries beyond 23 hours",async()=>{
    await seed();const repo=new PostgresNotificationRepository(sql);
    expect(await repo.claim("production")).toBeNull();
    await sql`UPDATE order_notification SET first_attempt_at=now()-interval '24 hours'`;
    expect(await repo.claim("test")).toBeNull();
    expect(await sql`SELECT state FROM order_notification`).toMatchObject([{state:"review"}]);
  });
  it("OPS-05: freezes the recipient and body, respects backoff and stops permanent failures",async()=>{
    await seed();const repo=new PostgresNotificationRepository(sql);const first=(await repo.claim("test"))!;
    const payload={from:"test@canela.test",to:["tester@example.com"],subject:"Test",html:"<p>Original</p>",text:"Original"};
    expect(await repo.prepare(first,payload)).toBe(true);
    await repo.failed(first,false,"MAIL_RETRY");expect(await repo.claim("test")).toBeNull();
    await sql`UPDATE order_notification SET available_at=now()`;
    const retry=(await repo.claim("test"))!;expect(retry.payload).toEqual(payload);
    await repo.prepare(retry,{...payload,text:"Changed"});
    expect((await sql`SELECT payload FROM order_notification`)[0].payload).toEqual(payload);
    await repo.failed(retry,true,"MAIL_REJECTED");expect(await repo.claim("test")).toBeNull();
  });
  it("OPS-01: finds a shipment by its tracking number",async()=>{
    const f=await seed();await sql`UPDATE order_shipment SET remote_summary=remote_summary || '{"trackingNumber":"OCA-SEARCH-123"}'::jsonb WHERE order_id=${f.id}`;
    const reader=new PostgresAdminOrderReader(sql);
    expect((await reader.list({q:"search-123",sort:"created_desc",cursor:null,limit:25})).orders.map(o=>o.id)).toEqual([f.id]);
    expect((await reader.list({q:"%_",sort:"created_desc",cursor:null,limit:25})).orders).toHaveLength(0);
  });

});
