import {
  getPublicOrderStatus,
  type PublicOrderStatusRepository,
} from "../../application/get-public-order-status";
import { hashOrderToken } from "../../infrastructure/order-token";
import type { ReconcilePaymentOrderResult } from "../../../payments/application/reconcile-payment-order";
import { PaymentOrderGatewayError } from "../../../payments/domain/payment-order";

const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type ReconcilePublicOrderDependencies = {
  reconcile(publicTokenHash: string): Promise<ReconcilePaymentOrderResult>;
  statusRepository: PublicOrderStatusRepository;
  reportUnexpectedError?: () => void;
};

export async function handleReconcilePublicOrderRequest(
  publicToken: string,
  dependencies: ReconcilePublicOrderDependencies,
): Promise<Response> {
  if (!PUBLIC_TOKEN_PATTERN.test(publicToken)) {
    return json({ code: "ORDER_NOT_FOUND" }, 404);
  }

  const tokenHash = hashOrderToken(publicToken);
  try {
    const result = await dependencies.reconcile(tokenHash);
    if (result.kind === "unknown_order") {
      return json({ code: "ORDER_NOT_FOUND" }, 404);
    }

    const order = await getPublicOrderStatus(
      dependencies.statusRepository,
      tokenHash,
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
  } catch (error) {
    dependencies.reportUnexpectedError?.();
    if (error instanceof PaymentOrderGatewayError) {
      return json({ code: "PAYMENT_RECONCILIATION_UNAVAILABLE" }, 503);
    }
    return json({ code: "INTERNAL_ERROR" }, 500);
  }
}

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
