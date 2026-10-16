import { getDatabase } from "@/db/client";
import { after } from "next/server";
import { tryOrderNotifications } from "@/modules/notifications/infrastructure/notification-service";
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

  const response = await handleMercadoPagoWebhook(request, {
    secret: config.secret,
    expectedLiveMode: config.liveMode,
    confirm: (notification) =>
      confirmPaymentNotification(
        {
          repository,
          payments,
          expectedProvider: {
            environment: config.environment,
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
  if (response.ok) after(() => tryOrderNotifications());
  return response;
}

function report(event: string, context: object = {}): void {
  console.error(JSON.stringify({ event, ...context }));
}
