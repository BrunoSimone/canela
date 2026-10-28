import type { Sql } from 'postgres';
import { readMercadoPagoPaymentConfig } from '@/modules/payments/infrastructure/server/payment-config';
import { MercadoPagoClient } from '@/modules/payments/infrastructure/mercado-pago/client';
import { PostgresPaymentConfirmationRepository } from '@/modules/payments/infrastructure/postgres/payment-confirmation-repository';
import { reconcilePaymentOrder } from '@/modules/payments/application/reconcile-payment-order';
import { FrameCommerceError } from '../domain/workshop';
import { recoverFrameCheckout } from '../application/recover-frame-checkout';
export async function recoverFramePayment(sql:Sql,id:string,actor:string) {
 const [order]=await sql`SELECT o.environment,o.public_token_hash,o.checkout_idempotency_key,c.quote_id,p.provider_order_id FROM orders o JOIN custom_frame_order c ON c.order_id=o.id JOIN payment_attempt p ON p.order_id=o.id WHERE o.id=${id}`;
 if(!order)throw new FrameCommerceError('NOT_FOUND','No encontramos el cuadro.',404);
 const config=readMercadoPagoPaymentConfig();
 if(config.environment!==order.environment)throw new FrameCommerceError('FRAME_ENVIRONMENT','La configuración de pagos corresponde a otro ambiente.',503);
 if(!order.provider_order_id) {
   // Retry the same provider idempotency key; never create a new purchase or approve locally.
   const signingSecret=process.env.CHECKOUT_SIGNING_SECRET,siteUrl=process.env.NEXT_PUBLIC_SITE_URL;
   if(!signingSecret||signingSecret.length<32||!siteUrl)throw Error('Frame recovery configuration incomplete');
   const url=new URL(siteUrl);if(url.username||url.password||!['http:','https:'].includes(url.protocol)||(config.environment==='production'&&url.protocol!=='https:'))throw Error('Invalid recovery URL');
   await recoverFrameCheckout({sql,environment:config.environment,payments:new MercadoPagoClient({accessToken:config.accessToken}),siteUrl:url.origin,signingSecret},id);
 }
 await reconcilePaymentOrder({repository:new PostgresPaymentConfirmationRepository(sql),payments:new MercadoPagoClient({accessToken:config.accessToken}),expectedProvider:{environment:config.environment,sellerUserId:config.sellerUserId,applicationId:config.applicationId}},order.public_token_hash);
 await sql`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${id},'payment_consulted',${actor})`;
}
