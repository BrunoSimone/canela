import {
  getPublicOrderStatus,
  type PublicOrderStatusRepository,
} from "../../application/get-public-order-status";
import { hashOrderToken } from "../../infrastructure/order-token";

const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function handlePublicOrderStatusRequest(
  publicToken: string,
  repository: PublicOrderStatusRepository,
  reportUnexpectedError?: () => void,
): Promise<Response> {
  if (!PUBLIC_TOKEN_PATTERN.test(publicToken)) {
    return json({ code: "ORDER_NOT_FOUND" }, 404);
  }

  try {
    const order = await getPublicOrderStatus(
      repository,
      hashOrderToken(publicToken),
    );
    if (!order) {
      return json({ code: "ORDER_NOT_FOUND" }, 404);
    }

    return json(
      {
        status: order.status,
        canRetry: order.canRetry,
        expiresAt: order.expiresAt.toISOString(),
      },
      200,
    );
  } catch {
    reportUnexpectedError?.();
    return json({ code: "INTERNAL_ERROR" }, 500);
  }
}

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
