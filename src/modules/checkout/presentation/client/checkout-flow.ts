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
      return "Una pieza ya no está disponible para comprar. Quitala del carrito para continuar.";
    case "SHIPPING_QUOTE_EXPIRED":
      return "La cotización de envío venció. Volvé a calcular el envío para continuar.";
    case "SHIPPING_QUOTE_INVALID":
      return "No pudimos confirmar ese envío. Volvé a calcularlo antes de seguir.";
    case "SHIPPING_QUOTE_MISMATCH":
    case "SHIPPING_RATE_CHANGED":
      return "El pedido o la tarifa cambió. Volvé a calcular el envío y confirmá el nuevo total.";
    case "UNSHIPPABLE_ITEM":
      return "Todavía no podemos calcular el envío de una de estas piezas. Podés quitarla del carrito para seguir con las demás.";
    case "PACKAGE_LIMIT_EXCEEDED":
      return "Este pedido es demasiado grande para los envíos disponibles. Probá quitando alguna pieza del carrito.";
    case "SHIPPING_NOT_AVAILABLE":
      return "No encontramos un envío disponible para esa localidad y código postal. Revisá el destino.";
    case "SHIPPING_PROVIDER_UNAVAILABLE":
    case "SHIPPING_MISCONFIGURED":
      return "No pudimos consultar el costo de envío. Intentá nuevamente en unos minutos.";
    case "SHIPPING_RATE_LIMITED":
      return "Hay muchas consultas de envío. Esperá un minuto y volvé a intentarlo.";
    case "INVALID_SHIPPING_REQUEST":
      return "Revisá la localidad, provincia y código postal para calcular el envío.";
    case "SHIPPING_DISABLED":
      return "La cotización de envíos todavía no está disponible.";
    case "CHECKOUT_ATTEMPT_CLOSED":
      return "Este intento de pago ya terminó. Podés volver a intentarlo.";
    case "CHECKOUT_ATTEMPT_CHANGED":
      return "Tu pedido cambió. Actualizá la página y revisalo antes de seguir.";
    case "PAYMENT_PROVIDER_UNAVAILABLE":
      return "Mercado Pago no pudo iniciar el cobro. Podés intentar nuevamente.";
    case "CHECKOUT_DISABLED":
      return "El pago online todavía no está disponible. Conservamos tus piezas en el carrito.";
    case "INVALID_CHECKOUT":
      return "Revisá tus datos, la dirección de entrega y las piezas del pedido antes de continuar.";
    default:
      return "No pudimos iniciar el pago. Tus piezas siguen en el carrito; podés volver a intentar.";
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
          "¡Gracias por tu compra! Vamos a preparar tus piezas. Cuando las despachemos, te mandamos el seguimiento por email.",
        label: "Pedido recibido",
        tone: "success",
        allowNewAttempt: false,
      };
    case "not_completed":
      return {
        title: "El pago no se completó",
        description:
          "No se realizó el cobro. Tus piezas siguen en el carrito y podés volver a intentar el pago.",
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
