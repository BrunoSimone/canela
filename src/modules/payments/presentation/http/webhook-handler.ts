import type {
  ConfirmPaymentNotificationResult,
  PaymentNotification,
} from "../../application/confirm-payment-notification";
import { verifyMercadoPagoWebhookSignature } from "../../infrastructure/mercado-pago/webhook-signature";

const MAX_BODY_BYTES = 64 * 1024;

type MercadoPagoWebhookHandlerDependencies = {
  secret: string;
  expectedLiveMode: boolean;
  confirm(
    notification: PaymentNotification,
  ): Promise<ConfirmPaymentNotificationResult>;
  reportUnexpectedError?: () => void;
};

export async function handleMercadoPagoWebhook(
  request: Request,
  dependencies: MercadoPagoWebhookHandlerDependencies,
): Promise<Response> {
  const url = new URL(request.url);
  const dataIds = url.searchParams.getAll("data.id");
  const types = url.searchParams.getAll("type");
  const dataId = dataIds.length === 1 ? dataIds[0] : null;

  if (types.length !== 1 || types[0] !== "order" || !dataId) {
    return json({ code: "INVALID_WEBHOOK" }, 400);
  }

  const requestId = request.headers.get("x-request-id");
  const validSignature = verifyMercadoPagoWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: requestId,
    dataId,
    secret: dependencies.secret,
  });
  if (!validSignature || !requestId) {
    return json({ code: "INVALID_SIGNATURE" }, 401);
  }

  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return json({ code: "INVALID_WEBHOOK" }, 400);
  }
  if (!isOrderNotification(body, dataId, dependencies.expectedLiveMode)) {
    return json({ code: "INVALID_WEBHOOK" }, 400);
  }

  try {
    await dependencies.confirm({
      deliveryId: requestId,
      providerOrderId: dataId,
    });
    return json({ received: true }, 200);
  } catch {
    dependencies.reportUnexpectedError?.();
    return json({ code: "WEBHOOK_RETRY" }, 503);
  }
}

async function readBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new Error("Webhook body exceeds the limit");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("Webhook body exceeds the limit");
  }
  return JSON.parse(text) as unknown;
}

function isOrderNotification(
  value: unknown,
  dataId: string,
  expectedLiveMode: boolean,
): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "order" &&
    "action" in value &&
    typeof value.action === "string" &&
    value.action.startsWith("order.") &&
    "live_mode" in value &&
    value.live_mode === expectedLiveMode &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "id" in value.data &&
    value.data.id === dataId
  );
}

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
