import { getDatabase } from "@/db/client";
import { demoOrderById } from "@/modules/admin/infrastructure/demo-orders";
import { currentAdminSession, isDemoRequest, privateJson } from "@/modules/admin/infrastructure/admin-request";
import { PostgresAdminOrderReader } from "@/modules/admin/infrastructure/postgres-order-reader";

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
    return order ? privateJson(order) : privateJson({ code: "ORDER_NOT_FOUND" }, 404);
  } catch {
    console.error(JSON.stringify({ event: "admin_order_read_failed" }));
    return privateJson({ code: "ADMIN_ORDERS_UNAVAILABLE" }, 503);
  }
}
