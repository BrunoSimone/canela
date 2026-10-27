import type { Sql } from 'postgres';
import { presentOrderStatus, type InternalOrderStatus } from '@/modules/checkout/application/get-public-order-status';
import { hashOrderToken } from '@/modules/checkout/infrastructure/order-token';
import type { FrameSnapshot,ProductionState } from '../../domain/frame-order';
export class PublicFrameReader {
 constructor(private sql:Sql){}
 async get(token:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  const [r]=await this.sql`SELECT o.status,o.environment,o.subtotal_cents,o.shipping_cents,o.total_cents,c.snapshot,c.production_state FROM orders o JOIN custom_frame_order c ON c.order_id=o.id WHERE o.public_token_hash=${hashOrderToken(token)}`;
  if(!r)return null;
  const snapshot=r.snapshot as FrameSnapshot;
  return {status:presentOrderStatus(r.status as InternalOrderStatus).status,production:r.production_state as ProductionState,environment:r.environment as 'test'|'production',design:snapshot.design,frameCents:Number(r.subtotal_cents),shippingCents:Number(r.shipping_cents),totalCents:Number(r.total_cents),productionDays:snapshot.productionDays};
 }
}
export type PublicFrame=NonNullable<Awaited<ReturnType<PublicFrameReader['get']>>>;
