import type { Sql } from "postgres";
import { enqueueOrderNotice } from "@/modules/notifications/infrastructure/enqueue";
import { FulfillmentError, type FulfillmentContext, type DispatchSummary } from "../domain/fulfillment";
import { safeTrackingUrl } from "./zipnova/fulfillment-client";

export class PostgresDispatchRepository {
  constructor(private readonly sql:Sql,private readonly context:FulfillmentContext){}
  async confirm(orderId:string,expectedRemoteId:number,actor:string):Promise<DispatchSummary>{
    return this.sql.begin(async tx=>{
      const [order]=await tx`SELECT status,environment FROM orders WHERE id=${orderId} FOR UPDATE`;
      if(!order)throw new FulfillmentError("ORDER_NOT_FOUND",404);
      const [shipment]=await tx`SELECT * FROM order_shipment WHERE order_id=${orderId} FOR UPDATE`;
      if(!shipment||Number(shipment.provider_id)!==expectedRemoteId)throw new FulfillmentError("DISPATCH_SHIPMENT_CHANGED");
      const quote=shipment.request_snapshot.quote;
      if(quote.contextFingerprint!==this.context.contextFingerprint||quote.accountMode!==this.context.accountMode||
        (order.environment==="production")!==(quote.accountMode==="operational"))throw new FulfillmentError("SHIPMENT_CONTEXT_CHANGED");
      const [existing]=await tx`SELECT * FROM order_dispatch WHERE order_id=${orderId}`;
      if(existing)return {dispatchedAt:existing.dispatched_at.toISOString(),dispatchedBy:existing.actor_email};
      if(!["paid","fulfillment_pending"].includes(order.status))throw new FulfillmentError("SHIPMENT_PAYMENT_REQUIRED");
      const tracking=safeTrackingUrl(shipment.remote_summary?.trackingUrl);
      if(shipment.state!=="label_ready"||!shipment.label_pdf||!tracking)throw new FulfillmentError("DISPATCH_NOT_READY");
      const [row]=await tx`INSERT INTO order_dispatch(order_id,provider_id,tracking_url,tracking_number,actor_email)
        VALUES(${orderId},${expectedRemoteId},${tracking},${shipment.remote_summary.trackingNumber??null},${actor}) RETURNING *`;
      await tx`UPDATE orders SET status='shipped',updated_at=now() WHERE id=${orderId}`;
      await enqueueOrderNotice(tx,orderId,"buyer_shipped");
      return {dispatchedAt:row.dispatched_at.toISOString(),dispatchedBy:row.actor_email};
    });
  }
  async get(orderId:string):Promise<DispatchSummary|null>{
    const [r]=await this.sql`SELECT actor_email,dispatched_at FROM order_dispatch WHERE order_id=${orderId}`;
    return r?{dispatchedAt:r.dispatched_at.toISOString(),dispatchedBy:r.actor_email}:null;
  }
}
