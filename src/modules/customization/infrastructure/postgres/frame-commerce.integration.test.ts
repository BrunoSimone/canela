import { randomUUID } from 'node:crypto';
import { beforeAll,beforeEach,afterAll,describe,it,expect,vi } from 'vitest';
import type { Sql } from 'postgres';
import { createDatabaseClient } from '@/db/client';
import { runMigrations } from '@/db/migrate';
import { GalleryPublisher } from '../gallery-publisher';
import { PublicFrameReader } from './public-frame';
import { PostgresAdminOrderReader } from '@/modules/admin/infrastructure/postgres-order-reader';
import { PostgresShipmentRepository } from '@/modules/shipping/infrastructure/postgres-shipment-repository';
import { renderNotification } from '@/modules/notifications/infrastructure/order-mail';
import { validateShipmentOrder } from '@/modules/shipping/domain/fulfillment';
import { FrameCommerce } from '../../application/frame-commerce';
import { demoWorkshop } from '../demo-workshop';
import { demoDesignCatalog } from '../demo-catalog';
import { demoRecipient } from '../demo-purchase-config';
import { selectDesign } from '../../domain/purchase';
import { SignedCourierQuoteService } from '@/modules/shipping/infrastructure/signed-courier-quote';
import { ZIPNOVA_INPUT_CONSTRAINTS } from '@/modules/shipping/infrastructure/server/shipping-config';
import { DEFAULT_QUOTE_MARGIN } from '@/modules/shipping/domain/quote-margin';
import { PostgresPaymentConfirmationRepository } from '@/modules/payments/infrastructure/postgres/payment-confirmation-repository';
import { PostgresPublicOrderStatusRepository } from '@/modules/checkout/infrastructure/postgres/public-order-status-repository';
import { FrameProduction } from './production';
import { PostgresOrderPreparationRepository } from '@/modules/admin/infrastructure/postgres-preparation';
import { PostgresFrameRepository } from './frame-repository';
import { hashOrderToken } from '@/modules/checkout/infrastructure/order-token';
import type { CreatePaymentOrderInput,PaymentOrder } from '@/modules/payments/domain/payment-order';
import { PaymentOrderGatewayError } from '@/modules/payments/domain/payment-order';

const connection=process.env.TEST_DATABASE_URL;
if(connection && !['localhost','127.0.0.1'].includes(new URL(connection).hostname)) throw Error('Local disposable database required');
if(process.env.RUN_DB_INTEGRATION==='1'&&!connection) throw Error('TEST_DATABASE_URL required');
const rate={carrierId:1,carrierName:'Correo',serviceCode:'standard_delivery' as const,serviceName:'Domicilio',dispatchType:'carrier_dropoff' as const,amountCents:850000,sellerAmountCents:850000};
const secret='x'.repeat(40);
const makeOrder=(i:CreatePaymentOrderInput):PaymentOrder=>({providerOrderId:`provider-${i.idempotencyKey}`,externalReference:i.externalReference,state:'created',providerStatus:'created',providerStatusDetail:null,totalCents:i.totalCents,currency:'ARS',checkoutUrl:'https://mercadopago.test/pay',sellerUserId:'1',applicationId:'2'});
const payment=vi.fn(async(i:CreatePaymentOrderInput)=>makeOrder(i));
const quote=vi.fn(async()=>[rate]);
let sql:Sql;
const inventory={settle:vi.fn()} as unknown as import('@/modules/inventory/domain/inventory-store').InventoryStore;
const service=()=>new FrameCommerce({sql,workshop:demoWorkshop,shipping:{rates:{quoteShipment:quote},issuer:new SignedCourierQuoteService(secret),accountMode:'sandbox',contextFingerprint:'f'.repeat(64),constraints:ZIPNOVA_INPUT_CONSTRAINTS,maxParcels:1,marginPolicy:DEFAULT_QUOTE_MARGIN},payments:{createOrder:payment,getOrder:vi.fn()},siteUrl:'http://localhost:3000',signingSecret:secret});
async function quoted(galleryConsent=false) {
  return (await service().quote({accepted:true,galleryConsent,termsVersion:'preview-1',design:selectDesign((await demoDesignCatalog.templates())[0].design),recipient:demoRecipient}))[0];
}
async function confirm(id:string,state:'approved'|'rejected'='approved',event=randomUUID()) {
 const [p]=await sql`SELECT provider_order_id FROM payment_attempt WHERE order_id=${id}`;
 return new PostgresPaymentConfirmationRepository(sql,inventory).apply({orderId:id,providerOrderId:p.provider_order_id,state,providerStatus:state,providerStatusDetail:null,webhookDeliveryId:event});
}

describe.skipIf(!connection)('PER-146 persistent frame lifecycle',()=>{
 beforeAll(async()=>{sql=createDatabaseClient(connection!);await runMigrations(sql);});
 beforeEach(async()=>{await sql`TRUNCATE orders,custom_frame_quote,processed_webhook CASCADE`;payment.mockReset().mockImplementation(async i=>makeOrder(i));quote.mockReset().mockResolvedValue([rate]);vi.mocked(inventory.settle).mockClear();});
 afterAll(async()=>{await sql?.end();});
 it('persists retouches, survives service replacement, duplicate payment and webhook; never consumes inventory',async()=>{
  const q=await quoted(),attemptId=randomUUID();
  const first=await service().pay({quoteId:q.id,attemptId});
  const second=await service().pay({quoteId:q.id,attemptId});
  expect(second.orderToken).toBe(first.orderToken);expect(payment).toHaveBeenCalledTimes(1);
  const [o]=await sql`SELECT id FROM orders`;
  const event=randomUUID();await confirm(o.id,'approved',event);expect(await confirm(o.id,'approved',event)).toEqual({kind:'duplicate'});
  expect((await new FrameProduction(sql).get(o.id))?.snapshot.design).toEqual(q.snapshot.design);
  expect((await new PostgresPublicOrderStatusRepository(sql).findByTokenHash(hashOrderToken(first.orderToken)))?.status).toBe('paid');
  expect(inventory.settle).not.toHaveBeenCalled();
  expect((await sql`SELECT * FROM order_notification`)).toHaveLength(1);
  await expect(sql`UPDATE custom_frame_order SET snapshot='{}'::jsonb WHERE order_id=${o.id}`).rejects.toThrow();
 });
 it('serializes concurrent reservations and never oversells the five workshop positions',async()=>{
  const qs=await Promise.all(Array.from({length:6},()=>quoted()));
  const results=await Promise.allSettled(qs.map(q=>service().pay({quoteId:q.id,attemptId:randomUUID()})));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);
  expect((await sql`SELECT * FROM orders`)).toHaveLength(5);
 });
 it('requires verified payment and versioned production, blocks packing until ready, then releases capacity',async()=>{
  const q=await quoted();await service().pay({quoteId:q.id,attemptId:randomUUID()});const [o]=await sql`SELECT id FROM orders`;
  const p=new FrameProduction(sql);
  expect(await p.get(o.id)).toBeNull();await expect(p.advance(o.id,1,'making','owner')).rejects.toThrow();
  await confirm(o.id); const current=(await p.get(o.id))!;
  const packing=new PostgresOrderPreparationRepository(sql),input={expectedVersion:0,parcels:[{weightGrams:6000,heightCm:8,widthCm:70,lengthCm:70}],note:null};
  await expect(packing.save(o.id,'owner',input)).rejects.toThrow();
  await expect(p.advance(o.id,current.version,'ready','owner')).rejects.toThrow();
  await p.advance(o.id,current.version,'making','owner');
  await expect(p.advance(o.id,current.version,'ready','owner')).rejects.toThrow();
  await p.advance(o.id,current.version+1,'ready','owner');
  expect(await packing.save(o.id,'owner',input)).toMatchObject({version:1});
  expect((await sql`SELECT reservation_state FROM custom_frame_order`)[0].reservation_state).toBe('completed');
 });
 it('does not release ambiguous or pending payments by quote expiry; definitive rejection releases and late approval needs review',async()=>{
  const q=await quoted();await service().pay({quoteId:q.id,attemptId:randomUUID()});const [o]=await sql`SELECT id FROM orders`;
  await sql`UPDATE custom_frame_order SET expires_at=now()-interval '1 hour'`;
  expect((await sql`SELECT reservation_state FROM custom_frame_order`)[0].reservation_state).toBe('active');
  await sql`UPDATE orders SET created_at=now()-interval '2 hours' WHERE id=${o.id}`;
  expect(await new PostgresAdminOrderReader(sql).get(o.id)).toMatchObject({status:'attention',statusLabel:'Necesita revisión'});
  await confirm(o.id,'rejected');expect((await sql`SELECT reservation_state FROM custom_frame_order`)[0].reservation_state).toBe('released');
  await confirm(o.id);expect((await sql`SELECT status FROM orders`)[0].status).toBe('review_required');expect(await new FrameProduction(sql).get(o.id)).toBeNull();
 });
 it('refuses expired or repriced quotes, changed attempts and multiple purchases of the same quote',async()=>{
  const q=await quoted();quote.mockResolvedValue([{...rate,amountCents:rate.amountCents+1}]);await expect(service().pay({quoteId:q.id,attemptId:randomUUID()})).rejects.toThrow();expect(payment).not.toHaveBeenCalled();
  quote.mockResolvedValue([rate]);const attemptId=randomUUID();await service().pay({quoteId:q.id,attemptId});
  await expect(service().pay({quoteId:q.id,attemptId:randomUUID()})).rejects.toThrow();
  const other=await quoted();await expect(service().pay({quoteId:other.id,attemptId})).rejects.toThrow();
  const expired={...other,expiresAt:new Date(0).toISOString()};await sql`UPDATE custom_frame_quote SET payload=${sql.json(JSON.parse(JSON.stringify(expired)))} WHERE id=${other.id}`;
  await expect(service().pay({quoteId:other.id,attemptId:randomUUID()})).rejects.toThrow();
 });
 it('handles definitive provider failures and ambiguous retries without losing the design',async()=>{
  const q=await quoted();payment.mockRejectedValueOnce(new PaymentOrderGatewayError('definitive'));
  await expect(service().pay({quoteId:q.id,attemptId:randomUUID()})).rejects.toThrow();
  expect((await sql`SELECT reservation_state FROM custom_frame_order`)[0].reservation_state).toBe('released');
  const another=await quoted(),attemptId=randomUUID();payment.mockRejectedValueOnce(new PaymentOrderGatewayError('ambiguous'));
  const uncertain=await service().pay({quoteId:another.id,attemptId});expect(uncertain).toMatchObject({uncertain:true,checkoutUrl:null});
  expect((await new PostgresFrameRepository(sql).getQuote(another.id))?.snapshot.design).toEqual(another.snapshot.design);
  const retried=await service().pay({quoteId:another.id,attemptId});expect(retried.orderToken).toBe(uncertain.orderToken);
 });
 it('keeps gallery publication consented, editorial, private and idempotent in its own environment',async()=>{
  const writer={createIfNotExists:vi.fn().mockResolvedValue({})},publisher=new GalleryPublisher(sql,writer,'test');
  const q=await quoted(true),paid=await service().pay({quoteId:q.id,attemptId:randomUUID()}),[o]=await sql`SELECT id FROM orders`;
  await expect(publisher.prepare(o.id,'owner')).rejects.toThrow();await confirm(o.id);
  await expect(new GalleryPublisher(sql,writer,'production').prepare(o.id,'owner')).rejects.toThrow();expect(writer.createIfNotExists).not.toHaveBeenCalled();
  writer.createIfNotExists.mockRejectedValueOnce(Error('network'));await expect(publisher.prepare(o.id,'owner')).rejects.toThrow();
  const result=await publisher.prepare(o.id,'owner');await publisher.prepare(o.id,'owner');expect(writer.createIfNotExists).toHaveBeenCalledTimes(2);
  const doc=writer.createIfNotExists.mock.calls[1][0];expect(doc._id).toBe(`drafts.${result.documentId}`);const serialized=JSON.stringify(doc);
  for(const privateValue of [o.id,paid.orderToken,q.recipient.email,q.recipient.delivery.recipientName,'workshopFingerprint','materials','priceCents'])expect(serialized).not.toContain(privateValue);
  const noConsent=await quoted(false);await service().pay({quoteId:noConsent.id,attemptId:randomUUID()});const [other]=await sql`SELECT order_id FROM custom_frame_order WHERE quote_id=${noConsent.id}`;await confirm(other.order_id);await expect(publisher.prepare(other.order_id,'owner')).rejects.toThrow();
 });
 it('protects public receipt data, keeps administrative details and renders the right owner email',async()=>{
  const q=await quoted(),paid=await service().pay({quoteId:q.id,attemptId:randomUUID()}),[o]=await sql`SELECT id FROM orders`;await confirm(o.id);
  const reader=new PublicFrameReader(sql);expect(await reader.get(o.id)).toBeNull();expect(await reader.get('x'.repeat(43))).toBeNull();
  const receipt=await reader.get(paid.orderToken);expect(receipt).toMatchObject({status:'paid',production:'queued',design:q.snapshot.design,totalCents:q.snapshot.priceCents+q.shipping.amountCents});
  const serialized=JSON.stringify(receipt);for(const value of ['materials','terms','gallery','buyerEmail',q.recipient.email])expect(serialized).not.toContain(value);
  const admin=await new PostgresAdminOrderReader(sql).get(o.id);expect(admin).toMatchObject({statusLabel:'Cuadro por fabricar',frame:{state:'queued',design:q.snapshot.design}});
  const [job]=await sql`SELECT id FROM order_notification`;
  const email=await renderNotification(sql,{environment:'test',apiKey:'unused',from:'test@example.com',siteUrl:'http://localhost:3000',ownerEmail:null,testTo:'test@example.com'},{id:job.id,orderId:o.id,environment:'test',kind:'owner_paid',attempts:0} as Parameters<typeof renderNotification>[2]);
  expect(email.to).toEqual(['test@example.com']);expect(email.text).toContain('fabric');expect(email.text).toContain('7');expect(email.text).not.toContain('Murvi');
 });
 it('never regresses a verified payment when a concurrent provider creation finishes later',async()=>{
  const q=await quoted(),attemptId=randomUUID();await service().pay({quoteId:q.id,attemptId});const [o]=await sql`SELECT id FROM orders`;await confirm(o.id);
  const provider=makeOrder(payment.mock.calls[0][0]);await new PostgresFrameRepository(sql).saveProviderOrder(o.id,provider);
  expect((await sql`SELECT status FROM payment_attempt`)[0].status).toBe('approved');expect((await sql`SELECT status FROM orders`)[0].status).toBe('paid');
  const repeated=await service().pay({quoteId:q.id,attemptId});expect(repeated.checkoutUrl).toBeNull();expect(repeated.resultUrl).toContain('/cuadros/resultado/');expect(payment).toHaveBeenCalledTimes(1);
 });
 it('blocks an unfinished frame in the shipping service and transaction, even with a forged preparation',async()=>{
  const q=await quoted();await service().pay({quoteId:q.id,attemptId:randomUUID()});const [o]=await sql`SELECT id FROM orders`;await confirm(o.id);
  const repo=new PostgresShipmentRepository(sql),loaded=(await repo.loadOrder(o.id))!;
  expect(loaded.productionState).toBe('queued');expect(()=>validateShipmentOrder(loaded,1,{accountMode:'sandbox',contextFingerprint:'f'.repeat(64),maxParcels:1})).toThrow('SHIPMENT_PRODUCTION_REQUIRED');
  const p=new FrameProduction(sql),current=(await p.get(o.id))!;await p.advance(o.id,current.version,'making','owner');await p.advance(o.id,current.version+1,'ready','owner');
  const {weightGrams,heightCm,widthCm,lengthCm}=q.shipping.parcels[0];await new PostgresOrderPreparationRepository(sql).save(o.id,'owner',{expectedVersion:0,parcels:[{weightGrams,heightCm,widthCm,lengthCm}],note:null});
  const context={accountMode:'sandbox',contextFingerprint:'f'.repeat(64),maxParcels:1};
  const request={orderId:o.id,externalId:`CA-${o.id.replaceAll("-", "").slice(0,27)}`,preparationVersion:1,buyerEmail:q.recipient.email,delivery:q.recipient.delivery,quote:q.shipping};
  const claim=await repo.claim(request,'owner',context);expect(claim.acquired).toBe(true);
  await repo.saveRemote(o.id,{id:42,externalId:request.externalId,status:'new',trackingNumber:'sandbox-only',trackingUrl:null,amountCents:q.shipping.amountCents});
  await repo.saveLabel(o.id,Buffer.from('%PDF-fixture'));expect(Buffer.from((await repo.readLabel(o.id))!).toString()).toBe('%PDF-fixture');
 });

});
