import { CheckoutStartUncertainError } from "../../application/begin-checkout";
import {
  InvalidCheckoutItemsError,
  ProductNotSellableError,
} from "../../application/resolve-checkout-items";
import {
  PaymentProviderUnavailableError,
  type StartedCheckout,
} from "../../application/start-checkout";
import {
  CheckoutAttemptClosedError,
  CheckoutInventoryUnavailableError,
} from "../../domain/checkout";
import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
} from "../../../shipping/domain/shipping-quote";
import {
  CheckoutRequestValidationError,
  parseCheckoutRequest,
  type ParsedCheckoutRequest,
} from "./checkout-request";

const MAX_BODY_BYTES = 16 * 1024;

type CheckoutHandlerDependencies = {
  enabled: boolean;
  begin(input: ParsedCheckoutRequest): Promise<StartedCheckout>;
  reportUnexpectedError?: () => void;
};

export async function handleCheckoutRequest(
  request: Request,
  dependencies: CheckoutHandlerDependencies,
): Promise<Response> {
  if (!dependencies.enabled) {
    return json({ code: "CHECKOUT_DISABLED" }, 404);
  }

  try {
    const body = await readJsonBody(request);
    const input = parseCheckoutRequest(
      body,
      request.headers.get("Idempotency-Key"),
    );
    const checkout = await dependencies.begin(input);

    return json(
      {
        orderToken: checkout.orderToken,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: checkout.expiresAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof CheckoutRequestValidationError ||
      error instanceof InvalidCheckoutItemsError
    ) {
      return json({ code: "INVALID_CHECKOUT" }, 422);
    }
    if (error instanceof InvalidShippingQuoteError) {
      return json({ code: "SHIPPING_QUOTE_INVALID" }, 422);
    }
    if (error instanceof ExpiredShippingQuoteError) {
      return json({ code: "SHIPPING_QUOTE_EXPIRED" }, 409);
    }
    if (error instanceof ProductNotSellableError) {
      return json({ code: "PRODUCT_NOT_SELLABLE" }, 422);
    }
    if (error instanceof CheckoutInventoryUnavailableError) {
      return json({ code: "OUT_OF_STOCK" }, 409);
    }
    if (error instanceof CheckoutAttemptClosedError) {
      return json({ code: "CHECKOUT_ATTEMPT_CLOSED" }, 409);
    }
    if (error instanceof PaymentProviderUnavailableError) {
      return json({ code: "PAYMENT_PROVIDER_UNAVAILABLE" }, 502);
    }
    if (error instanceof CheckoutStartUncertainError) {
      return json(
        {
          code: "PAYMENT_PROVIDER_UNCERTAIN",
          orderToken: error.orderToken,
        },
        202,
      );
    }

    dependencies.reportUnexpectedError?.();
    return json({ code: "INTERNAL_ERROR" }, 500);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new CheckoutRequestValidationError();
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new CheckoutRequestValidationError();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CheckoutRequestValidationError();
  }
}

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
