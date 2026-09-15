import type {
  PublicOrderStatusResponse,
  StartedCheckoutResponse,
  UncertainCheckoutResponse,
} from "./checkout-api";

type CheckoutNavigation =
  | { kind: "provider"; url: string }
  | { kind: "status"; path: string };

export type CheckoutResultPresentation = {
  title: string;
  description: string;
  label: string;
  tone: "pending" | "success" | "warning";
  allowNewAttempt: boolean;
};

export function resolveCheckoutNavigation(
  response: StartedCheckoutResponse | UncertainCheckoutResponse,
): CheckoutNavigation {
  if ("checkoutUrl" in response) {
    return { kind: "provider", url: response.checkoutUrl };
  }
  return {
    kind: "status",
    path: `/checkout/resultado/${encodeURIComponent(response.orderToken)}`,
  };
}

export function checkoutErrorMessage(code: string | null): string {
  switch (code) {
    case "OUT_OF_STOCK":
      return "Una de las piezas ya no está disponible. Revisá el pedido antes de continuar.";
    case "PRODUCT_NOT_SELLABLE":
      return "Una pieza solo puede pedirse por encargo. Quitala del pago y consultanos por WhatsApp.";
    case "SHIPPING_QUOTE_EXPIRED":
      return "La cotización de envío venció. Actualizá esta página para obtener una nueva.";
    case "SHIPPING_QUOTE_INVALID":
      return "No pudimos validar el envío. Actualizá esta página antes de intentar nuevamente.";
    case "CHECKOUT_ATTEMPT_CLOSED":
      return "Este intento ya terminó. Volvé a intentar para iniciar uno nuevo.";
    case "PAYMENT_PROVIDER_UNAVAILABLE":
      return "Mercado Pago no pudo iniciar el cobro. Podés intentar nuevamente.";
    case "CHECKOUT_DISABLED":
      return "El pago online todavía no está disponible. Podés enviarnos la consulta por WhatsApp.";
    case "INVALID_CHECKOUT":
      return "Revisá el email y las piezas del pedido antes de continuar.";
    default:
      return "No pudimos iniciar el pago. Tu pedido sigue guardado para que puedas intentar nuevamente.";
  }
}

export function readCheckoutErrorCode(error: unknown): string | null {
  if (!isRecord(error) || !isRecord(error.data)) return null;
  return typeof error.data.code === "string" ? error.data.code : null;
}

export function presentCheckoutResult(
  status: PublicOrderStatusResponse["status"],
): CheckoutResultPresentation {
  switch (status) {
    case "paid":
      return {
        title: "Pago confirmado",
        description:
          "Recibimos tu pedido. Canela va a preparar las piezas y te avisará cuando estén listas para despachar.",
        label: "Pedido recibido",
        tone: "success",
        allowNewAttempt: false,
      };
    case "not_completed":
      return {
        title: "El pago no se completó",
        description:
          "No se realizó el cobro. Tus piezas siguen en el carrito y podés iniciar un nuevo intento.",
        label: "Sin cobro",
        tone: "warning",
        allowNewAttempt: true,
      };
    case "review_required":
      return {
        title: "Estamos revisando el pago",
        description:
          "Todavía no podemos confirmar el resultado. Para evitar un cobro duplicado, no vuelvas a pagar.",
        label: "Revisión necesaria",
        tone: "warning",
        allowNewAttempt: false,
      };
    case "verifying":
      return {
        title: "Estamos verificando el pago",
        description:
          "Mercado Pago todavía está procesando el resultado. Conservá esta página y no vuelvas a pagar.",
        label: "Verificando",
        tone: "pending",
        allowNewAttempt: false,
      };
  }
}

export function shouldClearCart(
  status: PublicOrderStatusResponse["status"],
): boolean {
  return status === "paid";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
