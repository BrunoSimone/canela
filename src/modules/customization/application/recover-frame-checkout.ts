import type { Sql } from 'postgres';
import type { PaymentOrderGateway } from '@/modules/payments/domain/payment-order';
import { startCheckout } from '@/modules/checkout/application/start-checkout';
import { createOrderToken,hashOrderToken } from '@/modules/checkout/infrastructure/order-token';
import { PostgresFrameRepository } from '../infrastructure/postgres/frame-repository';
import { FrameCommerceError } from '../domain/workshop';
/** Recover exactly one existing reservation; no workshop lookup, quote or new reservation. */
export async function recoverFrameCheckout(d:{sql:Sql;environment:'test'|'production';payments:PaymentOrderGateway;siteUrl:string;signingSecret:string},id:string){
 const [order]=await d.sql`SELECT o.environment,o.checkout_idempotency_key,o.public_token_hash,c.quote_id FROM orders o JOIN custom_frame_order c ON c.order_id=o.id WHERE o.id=${id}`;
 if(!order)throw new FrameCommerceError('NOT_FOUND','No encontramos el cuadro.',404);
 if(order.environment!==d.environment)throw new FrameCommerceError('FRAME_ENVIRONMENT','El pedido pertenece a otro ambiente.');
 const repository=new PostgresFrameRepository(d.sql,d.environment),existing=await repository.existing(order.checkout_idempotency_key,order.quote_id);
 if(!existing)throw new FrameCommerceError('NOT_FOUND','No encontramos la reserva.',404);
 const orderToken=createOrderToken(d.signingSecret,order.checkout_idempotency_key);
 if(hashOrderToken(orderToken)!==order.public_token_hash)throw new FrameCommerceError('TOKEN_CONFIGURATION','La configuración de acceso al pedido cambió. Necesita revisión.',503);
 const returnUrl=new URL(`/cuadros/resultado/${orderToken}`,d.siteUrl).href;
 return startCheckout({repository:{reserve:async()=>existing,saveProviderOrder:repository.saveProviderOrder.bind(repository),markProviderCreationUncertain:repository.markProviderCreationUncertain.bind(repository),releaseForDefinitiveProviderFailure:repository.releaseForDefinitiveProviderFailure.bind(repository)},payments:d.payments},{orderId:id,environment:d.environment,orderToken,publicTokenHash:order.public_token_hash,idempotencyKey:order.checkout_idempotency_key,buyerEmail:existing.buyerEmail,delivery:existing.delivery,returnUrl,shippingCents:existing.shippingCents,items:existing.items});
}
