import type { RequestedCheckoutItem } from "../../application/resolve-checkout-items";
import { InvalidDeliveryError, parseDeliverySnapshot, type DeliverySnapshot } from "../../domain/delivery";

const MAX_CHECKOUT_ITEMS = 20;

export type ParsedCheckoutRequest = {
  items: RequestedCheckoutItem[];
  buyerEmail: string;
  delivery: DeliverySnapshot;
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
    !isRecord(body.delivery) ||
    !isRecord(body.delivery.address) ||
    typeof body.shippingQuoteToken !== "string" ||
    !idempotencyKey ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(idempotencyKey)
  ) {
    throw new CheckoutRequestValidationError();
  }

  const buyerEmail = body.buyer.email.trim().toLowerCase();
  if (!isEmail(buyerEmail) || body.shippingQuoteToken.length > 32_768) {
    throw new CheckoutRequestValidationError();
  }

  const items = body.items.map(parseItem);
  let delivery: DeliverySnapshot;
  try {
    const address = body.delivery.address;
    delivery = parseDeliverySnapshot({
      type: body.delivery.type,
      buyerName: body.buyer.name,
      recipientName: body.delivery.recipientName ?? body.buyer.name,
      recipientDocument: body.delivery.recipientDocument,
      phone: body.buyer.phone,
      streetName: address.streetName,
      streetNumber: address.streetNumber,
      floor: address.floor,
      apartment: address.apartment,
      city: address.city,
      provinceCode: address.provinceCode,
      postalCode: address.postalCode,
    });
  } catch (error) {
    if (error instanceof InvalidDeliveryError) throw new CheckoutRequestValidationError();
    throw error;
  }

  return {
    items,
    buyerEmail,
    delivery,
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
