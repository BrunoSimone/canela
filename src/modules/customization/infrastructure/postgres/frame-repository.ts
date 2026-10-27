import { createHash, randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import type { CheckoutRepository, ReserveCheckoutInput, ReservedCheckout } from '@/modules/checkout/domain/checkout';
import type { PaymentOrder } from '@/modules/payments/domain/payment-order';
import type { FrameQuote } from '../../domain/frame-order';
import { FrameCommerceError } from '../../domain/workshop';

export class PostgresFrameRepository implements CheckoutRepository {
  constructor(private sql:Sql, private quote?:FrameQuote) {}
  async saveQuote(quote:FrameQuote) {
    await this.sql`INSERT INTO custom_frame_quote(id,payload,expires_at) VALUES(${quote.id},${this.sql.json(JSON.parse(JSON.stringify(quote)))},${quote.expiresAt})`;
  }
  async getQuote(id:string):Promise<FrameQuote|null> {
    const [r]=await this.sql`SELECT payload FROM custom_frame_quote WHERE id=${id}`; return r?.payload??null;
  }
  async existing(key:string,quoteId:string):Promise<ReservedCheckout|null> {
    const [r]=await this.sql`SELECT o.id,c.quote_id FROM orders o JOIN custom_frame_order c ON c.order_id=o.id WHERE o.checkout_idempotency_key=${key}`;
    if (!r) return null;
    if(r.quote_id!==quoteId) throw new FrameCommerceError('ATTEMPT_CHANGED','Este intento corresponde a otra cotización.');
    return this.read(r.id,true);
  }
  async reserve(input:ReserveCheckoutInput):Promise<ReservedCheckout> {
    const q=this.quote;
    if(!q || input.environment!=='test') throw new FrameCommerceError('FRAME_SALES_LOCKED','Los cobros de cuadros están bloqueados.',503);
    const id=await this.sql.begin(async tx=>{
      await tx`SELECT pg_advisory_xact_lock(146001)`;
      const [existing]=await tx`SELECT id,checkout_payload_hash FROM orders WHERE checkout_idempotency_key=${input.idempotencyKey}`;
      const digest=createHash('sha256').update(JSON.stringify({quoteId:q.id,publicTokenHash:input.publicTokenHash})).digest('hex');
      if(existing) {
        if(existing.checkout_payload_hash!==digest) throw new FrameCommerceError('ATTEMPT_CHANGED','El intento de compra cambió.');
        return existing.id as string;
      }
      if(new Date(q.expiresAt).getTime()<=Date.now()) throw new FrameCommerceError('QUOTE_EXPIRED','La cotización venció. Volvé a calcular el envío.');
      if((await tx`SELECT order_id FROM custom_frame_order WHERE quote_id=${q.id}`).length) throw new FrameCommerceError('QUOTE_USED','Esta cotización ya tiene un pedido. Consultá el resultado del intento anterior.');
      const [count]=await tx`SELECT count(*)::int AS n FROM custom_frame_order c JOIN orders o ON o.id=c.order_id WHERE o.environment='test' AND c.reservation_state IN ('active','consumed')`;
      if(count.n>=q.snapshot.capacity) throw new FrameCommerceError('CAPACITY_FULL','Por ahora no quedan lugares para fabricar otro cuadro.');
      await tx`INSERT INTO orders(id,public_token_hash,checkout_idempotency_key,checkout_payload_hash,currency,subtotal_cents,shipping_cents,total_cents,buyer_email,environment,shipping_quote_snapshot)
        VALUES(${input.orderId},${input.publicTokenHash},${input.idempotencyKey},${digest},'ARS',${q.snapshot.priceCents},${q.shipping.amountCents},${q.snapshot.priceCents+q.shipping.amountCents},${q.recipient.email},'test',${tx.json(JSON.parse(JSON.stringify(q.shipping)))})`;
      await tx`INSERT INTO custom_frame_order(order_id,quote_id,snapshot,expires_at,gallery_id)
        VALUES(${input.orderId},${q.id},${tx.json(JSON.parse(JSON.stringify(q.snapshot)))},${q.expiresAt},${randomUUID()})`;
      await tx`INSERT INTO order_item(order_id,product_id,name_snapshot,unit_price_cents,quantity)
        VALUES(${input.orderId},'custom-frame','Cuadro personalizado con marco',${q.snapshot.priceCents},1)`;
      const d=q.recipient.delivery;
      await tx`INSERT INTO order_delivery(order_id,buyer_name,recipient_name,recipient_phone,recipient_document,street_name,street_number,floor,apartment,city,province_code,postal_code)
        VALUES(${input.orderId},${d.buyerName},${d.recipientName},${d.phone},${d.recipientDocument??null},${d.streetName},${d.streetNumber},${d.floor},${d.apartment},${d.city},${d.provinceCode},${d.postalCode})`;
      await tx`INSERT INTO payment_attempt(id,order_id,provider_idempotency_key) VALUES(${randomUUID()},${input.orderId},${randomUUID()})`;
      await tx`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${input.orderId},'reserved','checkout')`;
      return input.orderId;
    });
    return this.read(String(id),id!==input.orderId);
  }
  private async read(id:string,reused:boolean):Promise<ReservedCheckout> {
    const [r]=await this.sql`SELECT o.*, c.expires_at,c.reservation_state,c.quote_id,p.provider_order_id,p.checkout_url,p.provider_idempotency_key FROM orders o JOIN custom_frame_order c ON c.order_id=o.id JOIN payment_attempt p ON p.order_id=o.id WHERE o.id=${id}`;
    if(!r || r.reservation_state!=='active' || !['created','payment_pending','review_required'].includes(r.status)) throw new FrameCommerceError('ATTEMPT_CLOSED','Este pedido ya se resolvió. Consultá su resultado.');
    const q=(await this.getQuote(r.quote_id))!;
    return {orderId:id,buyerEmail:r.buyer_email,delivery:q.recipient.delivery,currency:'ARS',subtotalCents:Number(r.subtotal_cents),shippingCents:Number(r.shipping_cents),totalCents:Number(r.total_cents),expiresAt:r.expires_at,providerIdempotencyKey:r.provider_idempotency_key,providerOrderId:r.provider_order_id,checkoutUrl:r.checkout_url,reused,items:[{productId:'custom-frame',name:'Cuadro personalizado con marco',quantity:1,unitPriceCents:Number(r.subtotal_cents)}]};
  }
  async saveProviderOrder(id:string,p:PaymentOrder) {
    await this.sql.begin(async tx=>{
      await tx`SELECT id FROM orders WHERE id=${id} FOR UPDATE`;
      const result=await tx`UPDATE payment_attempt SET provider_order_id=${p.providerOrderId},checkout_url=${p.checkoutUrl},provider_status=CASE WHEN status IN ('preference_pending','payment_pending','review_required') THEN ${p.providerStatus} ELSE provider_status END,provider_status_detail=CASE WHEN status IN ('preference_pending','payment_pending','review_required') THEN ${p.providerStatusDetail} ELSE provider_status_detail END,status=CASE WHEN status IN ('preference_pending','review_required') THEN 'payment_pending' ELSE status END,updated_at=now() WHERE order_id=${id} AND (provider_order_id IS NULL OR provider_order_id=${p.providerOrderId})`;
      if(result.count!==1) throw new Error('FRAME_PAYMENT_CONFLICT');
      await tx`UPDATE orders SET status='payment_pending',updated_at=now() WHERE id=${id} AND status IN ('created','review_required')`;
    });
  }
  async markProviderCreationUncertain(id:string) {
    await this.sql.begin(async tx=>{
      await tx`UPDATE orders SET status='review_required',updated_at=now() WHERE id=${id} AND status IN ('created','payment_pending')`;
      await tx`UPDATE payment_attempt SET status='review_required',updated_at=now() WHERE order_id=${id} AND status IN ('preference_pending','payment_pending')`;
    });
  }
  async releaseForDefinitiveProviderFailure(id:string) {
    await this.sql.begin(async tx=>{
      await tx`SELECT id FROM orders WHERE id=${id} FOR UPDATE`;
      const [p]=await tx`SELECT provider_order_id FROM payment_attempt WHERE order_id=${id} FOR UPDATE`;
      if(!p || p.provider_order_id) throw new Error('FRAME_PAYMENT_ALREADY_CREATED');
      await tx`UPDATE custom_frame_order SET reservation_state='released',updated_at=now() WHERE order_id=${id} AND reservation_state='active'`;
      await tx`UPDATE orders SET status='rejected',updated_at=now() WHERE id=${id}`;
      await tx`UPDATE payment_attempt SET status='rejected',updated_at=now() WHERE order_id=${id}`;
    });
  }
}
