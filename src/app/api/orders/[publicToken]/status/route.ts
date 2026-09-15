import { getDatabase } from "@/db/client";
import { PostgresPublicOrderStatusRepository } from "@/modules/checkout/infrastructure/postgres/public-order-status-repository";
import { handlePublicOrderStatusRequest } from "@/modules/checkout/presentation/http/public-order-status-handler";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ publicToken: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { publicToken } = await context.params;
  const repository = new PostgresPublicOrderStatusRepository(getDatabase());

  return handlePublicOrderStatusRequest(publicToken, repository, () => {
    console.error(JSON.stringify({ event: "public_order_status_error" }));
  });
}
