import { getDatabase } from "@/db/client";
import { confirmPaymentNotification } from "@/modules/payments/application/confirm-payment-notification";
import { MercadoPagoClient } from "@/modules/payments/infrastructure/mercado-pago/client";
import { PostgresPaymentConfirmationRepository } from "@/modules/payments/infrastructure/postgres/payment-confirmation-repository";
import { readMercadoPagoWebhookConfig } from "@/modules/payments/infrastructure/server/webhook-config";
import { handleMercadoPagoWebhook } from "@/modules/payments/presentation/http/webhook-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let config;
  try {
    config = readMercadoPagoWebhookConfig();
  } catch {
    report("mercado_pago_webhook_configuration_error");
    return Response.json(
      { code: "WEBHOOK_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const repository = new PostgresPaymentConfirmationRepository(getDatabase());
  const payments = new MercadoPagoClient({ accessToken: config.accessToken });

  return handleMercadoPagoWebhook(request, {
    secret: config.secret,
    expectedLiveMode: config.liveMode,
    confirm: (notification) =>
      confirmPaymentNotification(
        {
          repository,
          payments,
          expectedProvider: {
            sellerUserId: config.sellerUserId,
            applicationId: config.applicationId,
          },
          reportReviewRequired: (review) =>
            report("mercado_pago_payment_review_required", review),
        },
        notification,
      ),
    reportUnexpectedError: () => report("mercado_pago_webhook_retry"),
  });
}

function report(event: string, context: object = {}): void {
  console.error(JSON.stringify({ event, ...context }));
}
