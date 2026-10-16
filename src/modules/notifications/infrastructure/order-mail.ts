import type { Sql } from "postgres";
import { renderOrderNotice } from "@/emails/order-notice";
import { safeTrackingUrl } from "@/modules/shipping/infrastructure/zipnova/fulfillment-client";
import { MailDeliveryError, type NotificationJob, type OutboundEmail } from "../domain/notification";
import { validEmail, type OrderMailConfig } from "./mail-config";
export async function renderNotification(sql:Sql,config:OrderMailConfig,job:NotificationJob):Promise<OutboundEmail>{
  const [row]=await sql`SELECT o.id,o.status,o.environment,o.buyer_email,o.total_cents,o.shipping_quote_snapshot,
    d.tracking_url,d.tracking_number FROM orders o LEFT JOIN order_dispatch d ON d.order_id=o.id WHERE o.id=${job.orderId}`;
  if(!row||row.environment!==job.environment||!["paid","fulfillment_pending","shipped","delivered"].includes(row.status))throw new MailDeliveryError(true,"MAIL_ORDER_NOT_ELIGIBLE");
  const items=await sql`SELECT name_snapshot,quantity FROM order_item WHERE order_id=${job.orderId} ORDER BY product_id`;
  const actionUrl=job.kind==="owner_paid"?new URL(`/admin/pedidos/${job.orderId}`,config.siteUrl).href:safeTrackingUrl(row.tracking_url);
  const recipient=config.environment==="test"?config.testTo:job.kind==="owner_paid"?config.ownerEmail:row.buyer_email;
  if(!actionUrl||!validEmail(recipient??undefined))throw new MailDeliveryError(true,"MAIL_DETAILS_MISSING");
  return {from:config.from,to:[recipient!],...await renderOrderNotice({kind:job.kind,reference:`ID ${job.orderId.slice(0,8).toUpperCase()}`,test:job.environment==="test",actionUrl,
    carrier:row.shipping_quote_snapshot?.carrierName??null,trackingNumber:row.tracking_number??null,totalCents:Number(row.total_cents),items:items.map(i=>({name:i.name_snapshot,quantity:i.quantity}))})};
}
