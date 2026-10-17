import { inventoryFixture } from "@/modules/inventory/testing/memory-documents";
const fi = inventoryFixture();
vi.mock("@/modules/inventory/infrastructure/sanity-documents", () => ({ inventoryStore: () => fi.inventory }));
import { vi } from "vitest";
import { preparedParcels, preparedQuoteFingerprint } from "../domain/fulfillment";
import {randomUUID,createHash} from "node:crypto";
import type {Sql} from "postgres";
import {describe,it,expect,beforeAll,beforeEach,afterAll} from "vitest";
import {createDatabaseClient} from "../../../db/client";
import {runMigrations} from "../../../db/migrate";
import {createReservedOrder} from "../../../db/create-reserved-order";
import {PostgresOrderPreparationRepository} from "../../admin/infrastructure/postgres-preparation";
import {PostgresAdminOrderReader} from "../../admin/infrastructure/postgres-order-reader";
import {PostgresShipmentRepository} from "./postgres-shipment-repository";
import {fulfillmentFixture} from "../testing/fulfillment-fixture";

const url=process.env.TEST_DATABASE_URL;
if(process.env.RUN_DB_INTEGRATION==="1"&&!url)throw new Error("TEST_DATABASE_URL required");
if(url&&!["localhost","127.0.0.1"].includes(new URL(url).hostname))throw new Error("Local disposable database required");
(url?describe:describe.skip)("fulfillment persistence",()=>{
  let sql:Sql;
  beforeAll(async()=>{sql=createDatabaseClient(url!);await runMigrations(sql);});
  afterAll(async()=>{await sql?.end();});
  beforeEach(async()=>{ fi.documents.data.clear();await sql`TRUNCATE orders,inventory_item RESTART IDENTITY CASCADE`;});
  async function seed(){
    const f=await fulfillmentFixture();fi.documents.seed("piece", 1);
    await createReservedOrder(sql,{orderId:f.order.id,publicTokenHash:createHash("sha256").update(f.order.id).digest("hex"),idempotencyKey:randomUUID(),currency:"ARS",buyerEmail:f.order.buyerEmail,delivery:f.order.delivery!,shippingCents:f.order.shippingCents,shippingSnapshot:f.order.quote!,items:[{productId:"piece",name:"Pieza",quantity:1,unitPriceCents:f.order.subtotalCents}]});
    await sql`UPDATE orders SET status='paid' WHERE id=${f.order.id}`;
    await new PostgresOrderPreparationRepository(sql).save(f.order.id,"owner@example.com",{expectedVersion:0,parcels:f.order.preparation!.parcels,note:null});
    const repo=new PostgresShipmentRepository(sql),loaded=(await repo.loadOrder(f.order.id))!;
    return {...f,repo,request:{...f.request,quote:loaded.quote!,delivery:loaded.delivery!}};
  }
  it("stores approved actual packaging and cost without rewriting the sale", async () => {
    const f = await seed();
    await new PostgresOrderPreparationRepository(sql).save(f.order.id, "owner@example.com", { expectedVersion: 1, parcels: [{ ...f.order.preparation!.parcels[0], weightGrams: 1600 }], note: "Caja real" });
    const order = (await f.repo.loadOrder(f.order.id))!;
    const quote = { ...order.quote!, parcels: preparedParcels(order), planFingerprint: preparedQuoteFingerprint(order), amountCents: order.shippingCents + 200, sellerAmountCents: order.quote!.sellerAmountCents + 200 };
    const result = await f.repo.claim({ ...f.request, preparationVersion: 2, originalQuote: order.quote!, quote }, "owner@example.com", f.context);
    expect(result.record.request.quote.parcels[0].weightGrams).toBe(1600);
    const [saved] = await sql`SELECT shipping_cents, shipping_quote_snapshot FROM orders WHERE id=${f.order.id}`;
    expect(Number(saved.shipping_cents)).toBe(order.shippingCents);
    expect(saved.shipping_quote_snapshot).toEqual(order.quote);
  });
  it("rechecks actual dimensions inside the transaction", async () => {
    const f = await seed(), order = (await f.repo.loadOrder(f.order.id))!;
    const quote = { ...order.quote!, parcels: preparedParcels(order), planFingerprint: preparedQuoteFingerprint(order) };
    quote.parcels[0].weightGrams += 10;
    await expect(f.repo.claim({ ...f.request, originalQuote: order.quote!, quote }, "owner", f.context)).rejects.toThrow("SHIPMENT_PREPARATION_CHANGED");
    expect(await f.repo.get(f.order.id)).toBeNull();
  });
  it("persists recipient document and serializes concurrent claims",async()=>{
    const f=await seed();expect((await f.repo.loadOrder(f.order.id))?.delivery?.recipientDocument).toBe("12345678");
    const claims=await Promise.all(Array.from({length:5},()=>f.repo.claim(f.request,"owner@example.com",f.context)));
    expect(claims.filter(c=>c.acquired)).toHaveLength(1);
    const [row]=await sql`SELECT count(*)::int AS n FROM order_shipment`;expect(row.n).toBe(1);
    await expect(new PostgresOrderPreparationRepository(sql).save(f.order.id,"owner@example.com",{expectedVersion:1,parcels:f.order.preparation!.parcels,note:"change"})).rejects.toThrow();
  });
  it("checks payment and preparation again inside the claim",async()=>{
    const f=await seed();await sql`UPDATE orders SET status='refunded' WHERE id=${f.order.id}`;
    await expect(f.repo.claim(f.request,"owner@example.com",f.context)).rejects.toThrow("SHIPMENT_PAYMENT_REQUIRED");
    expect(await f.repo.get(f.order.id)).toBeNull();
  });
  it("retains label state through stale errors and renders it in the admin DTO",async()=>{
    const f=await seed();await f.repo.claim(f.request,"owner@example.com",f.context);
    await f.repo.saveRemote(f.order.id,f.remote);await f.repo.saveLabel(f.order.id,Buffer.from("%PDF-test"));
    expect((await f.repo.mark(f.order.id,"uncertain","timeout")).state).toBe("label_ready");
    expect(Buffer.from((await f.repo.readLabel(f.order.id))!).toString()).toBe("%PDF-test");
    const order=await new PostgresAdminOrderReader(sql).get(f.order.id);
    expect(order).toMatchObject({status:"label_ready",shipment:{state:"label_ready",sandbox:true}});
    expect(JSON.stringify(order)).not.toContain('"recipientDocument"');
    expect(JSON.stringify(order)).not.toContain('"recipient_document"');
    const [stock]=[(await fi.stock("piece"))].map(s => ({stock_on_hand:s.stockOnHand,reserved:s.reserved}));expect(stock).toMatchObject({stock_on_hand:1,reserved:1});
  });
  it("requires review after a remote price difference without changing payment",async()=>{
    const f=await seed();await f.repo.claim(f.request,"owner@example.com",f.context);
    expect((await f.repo.saveRemote(f.order.id,{...f.remote,amountCents:1})).state).toBe("review");
    await f.repo.saveLabel(f.order.id,Buffer.from("%PDF-test"));expect(await f.repo.readLabel(f.order.id)).toBeNull();
    const [order]=await sql`SELECT total_cents,status FROM orders WHERE id=${f.order.id}`;expect(order.status).toBe("fulfillment_pending");expect(Number(order.total_cents)).toBe(f.order.subtotalCents+f.order.shippingCents);
  });
});
