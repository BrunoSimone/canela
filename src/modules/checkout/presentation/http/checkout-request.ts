import type { RequestedCheckoutItem } from "../../application/resolve-checkout-items";

const MAX_CHECKOUT_ITEMS = 20;

export type ParsedCheckoutRequest = {
  items: RequestedCheckoutItem[];
  buyerEmail: string;
  shippingQuoteToken: string;
  idempotencyKey: string;
};

export class CheckoutRequestValidationError extends Error {
  constructor() {
    super("Checkout request is invalid");
    this.name = "CheckoutRequestValidationError";
  }
}

export function parseCheckoutRequest(
  body: unknown,
  idempotencyKey: string | null,
): ParsedCheckoutRequest {
  if (
    !isRecord(body) ||
    !Array.isArray(body.items) ||
    body.items.length === 0 ||
    body.items.length > MAX_CHECKOUT_ITEMS ||
    !isRecord(body.buyer) ||
    typeof body.buyer.email !== "string" ||
    typeof body.shippingQuoteToken !== "string" ||
    !idempotencyKey ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)
  ) {
    throw new CheckoutRequestValidationError();
  }

  const buyerEmail = body.buyer.email.trim().toLowerCase();
  if (!isEmail(buyerEmail) || body.shippingQuoteToken.length > 4_096) {
    throw new CheckoutRequestValidationError();
  }

  const items = body.items.map(parseItem);

  return {
    items,
    buyerEmail,
    shippingQuoteToken: body.shippingQuoteToken,
    idempotencyKey,
  };
}

function parseItem(value: unknown): RequestedCheckoutItem {
  if (!isRecord(value)) {
    throw new CheckoutRequestValidationError();
  }

  const { productId, quantity } = value;
  if (
    typeof productId !== "string" ||
    productId.length === 0 ||
    productId.length > 200 ||
    !Number.isSafeInteger(quantity) ||
    (quantity as number) <= 0
  ) {
    throw new CheckoutRequestValidationError();
  }

  return { productId, quantity: quantity as number };
}

function isEmail(value: string): boolean {
  return (
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
