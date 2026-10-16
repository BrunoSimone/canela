import { getDatabase } from "@/db/client";
import { demoOrderById } from "@/modules/admin/infrastructure/demo-orders";
import { currentAdminSession, isDemoRequest, privateJson } from "@/modules/admin/infrastructure/admin-request";
import { PostgresAdminOrderReader } from "@/modules/admin/infrastructure/postgres-order-reader";

import { fulfillmentEnabled } from "@/modules/shipping/infrastructure/server/fulfillment-service";
import { PostgresNotificationRepository } from "@/modules/notifications/infrastructure/postgres-notification-repository";
import { readOrderMailConfig } from "@/modules/notifications/infrastructure/mail-config";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const url = new URL(request.url);
  const demo = isDemoRequest(url);
  if (!demo && !(await currentAdminSession())) return privateJson({ code: "UNAUTHORIZED" }, 401);
  const { id } = await context.params;
  try {
    const order = demo
      ? demoOrderById(id)
      : await new PostgresAdminOrderReader(getDatabase()).get(id);
    if (!order) return privateJson({ code: "ORDER_NOT_FOUND" }, 404);
    let notificationsEnabled=false;
    try { notificationsEnabled=!demo && !!readOrderMailConfig(); } catch { /* Queue remains visible without mail configuration. */ }
    const notifications=demo?[]:await new PostgresNotificationRepository(getDatabase()).summary(id);
    const [dispatch]=demo?[]:await getDatabase()`SELECT dispatched_at,actor_email FROM order_dispatch WHERE order_id=${id}`;
    return privateJson({...order,shipmentEnabled:!demo && fulfillmentEnabled(),notifications,notificationsEnabled,
      dispatch:dispatch?{dispatchedAt:dispatch.dispatched_at.toISOString(),dispatchedBy:dispatch.actor_email}:null});
  } catch {
    console.error(JSON.stringify({ event: "admin_order_read_failed" }));
    return privateJson({ code: "ADMIN_ORDERS_UNAVAILABLE" }, 503);
  }
}
