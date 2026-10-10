import { getDatabase } from "@/db/client";
import { parseOrderQuery } from "@/modules/admin/domain/order";
import { listDemoOrders } from "@/modules/admin/infrastructure/demo-orders";
import { currentAdminSession, isDemoRequest, privateJson } from "@/modules/admin/infrastructure/admin-request";
import { PostgresAdminOrderReader } from "@/modules/admin/infrastructure/postgres-order-reader";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const demo = isDemoRequest(url);
  if (!demo && !(await currentAdminSession())) return privateJson({ code: "UNAUTHORIZED" }, 401);
  let query;
  try {
    query = parseOrderQuery(url);
    const page = demo
      ? listDemoOrders(query)
      : await new PostgresAdminOrderReader(getDatabase()).list(query);
    return privateJson(page);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_ORDER_")) {
      return privateJson({ code: error.message }, 400);
    }
    console.error(JSON.stringify({ event: "admin_orders_read_failed" }));
    return privateJson({ code: "ADMIN_ORDERS_UNAVAILABLE" }, 503);
  }
}
