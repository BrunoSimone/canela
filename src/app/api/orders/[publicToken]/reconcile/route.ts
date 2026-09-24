import { getDatabase } from "@/db/client";
import { PostgresPublicOrderStatusRepository } from "@/modules/checkout/infrastructure/postgres/public-order-status-repository";
import { handleReconcilePublicOrderRequest } from "@/modules/checkout/presentation/http/reconcile-public-order-handler";
import { reconcilePaymentOrder } from "@/modules/payments/application/reconcile-payment-order";
import { MercadoPagoClient } from "@/modules/payments/infrastructure/mercado-pago/client";
import { PostgresPaymentConfirmationRepository } from "@/modules/payments/infrastructure/postgres/payment-confirmation-repository";
import { readMercadoPagoPaymentConfig } from "@/modules/payments/infrastructure/server/payment-config";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ publicToken: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { publicToken } = await context.params;

  let config;
  try {
    config = readMercadoPagoPaymentConfig();
  } catch {
    report("mercado_pago_reconciliation_configuration_error");
    return Response.json(
      { code: "PAYMENT_RECONCILIATION_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const database = getDatabase();
  const confirmationRepository = new PostgresPaymentConfirmationRepository(
    database,
  );
  const statusRepository = new PostgresPublicOrderStatusRepository(database);
  const payments = new MercadoPagoClient({ accessToken: config.accessToken });

  return handleReconcilePublicOrderRequest(publicToken, {
    statusRepository,
    reconcile: (publicTokenHash) =>
      reconcilePaymentOrder(
        {
          repository: confirmationRepository,
          payments,
          expectedProvider: {
            sellerUserId: config.sellerUserId,
            applicationId: config.applicationId,
          },
          reportReviewRequired: (review) =>
            report("mercado_pago_payment_review_required", review),
        },
        publicTokenHash,
      ),
    reportUnexpectedError: () => report("mercado_pago_reconciliation_error"),
  });
}

function report(event: string, context: object = {}): void {
  console.error(JSON.stringify({ event, ...context }));
}
