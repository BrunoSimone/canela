import { createHash } from "node:crypto";
import { CHECKOUT_EXPIRATION } from "../../../checkout/domain/checkout-expiration";
import type { CreatePaymentOrderInput } from "../../domain/payment-order";
import { formatArsCents } from "./money";

const MAX_EXTERNAL_CODE_LENGTH = 30;

export type MercadoPagoOrderPayload = {
  type: "online";
  processing_mode: "manual";
  capture_mode: "automatic_async";
  total_amount: string;
  external_reference: string;
  expiration_time: typeof CHECKOUT_EXPIRATION.mercadoPagoDuration;
  payer: { email: string };
  items: Array<{
    external_code: string;
    title: string;
    unit_price: string;
    quantity: number;
  }>;
  config: {
    online: {
      success_url: string;
      failure_url: string;
      pending_url: string;
      auto_return: "all";
    };
    payment_method: { not_allowed_types: ["ticket"] };
  };
};

export function buildMercadoPagoOrderPayload(
  input: CreatePaymentOrderInput,
): MercadoPagoOrderPayload {
  validateInput(input);

  const items = input.items.map((item) => ({
    external_code: toMercadoPagoExternalCode(item.externalCode),
    title: item.title,
    unit_price: formatArsCents(item.unitPriceCents),
    quantity: item.quantity,
  }));

  return {
    type: "online",
    processing_mode: "manual",
    capture_mode: "automatic_async",
    total_amount: formatArsCents(input.totalCents),
    external_reference: input.externalReference,
    expiration_time: CHECKOUT_EXPIRATION.mercadoPagoDuration,
    payer: { email: input.payerEmail },
    items,
    config: {
      online: {
        success_url: input.returnUrl,
        failure_url: input.returnUrl,
        pending_url: input.returnUrl,
        auto_return: "all",
      },
      payment_method: { not_allowed_types: ["ticket"] },
    },
  };
}

function toMercadoPagoExternalCode(value: string): string {
  if (value.length <= MAX_EXTERNAL_CODE_LENGTH) {
    return value;
  }

  const digest = createHash("sha256").update(value).digest("hex").slice(0, 23);
  return `canela_${digest}`;
}

function validateInput(input: CreatePaymentOrderInput): void {
  if (
    input.externalReference.length === 0 ||
    input.externalReference.length > 64
  ) {
    throw new Error("Payment order external reference is invalid");
  }

  if (input.items.length === 0) {
    throw new Error("Payment order must contain at least one item");
  }

  for (const item of input.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Payment order item quantity must be a positive integer");
    }
    if (!item.externalCode || !item.title) {
      throw new Error("Payment order item identity is required");
    }
    formatArsCents(item.unitPriceCents);
    formatArsCents(item.unitPriceCents * item.quantity);
  }

  const itemTotal = input.items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );
  if (!Number.isSafeInteger(itemTotal) || itemTotal !== input.totalCents) {
    throw new Error("Payment order total does not match its items");
  }

  formatArsCents(input.totalCents);
  validateUrl(input.returnUrl, "return");
}

function validateUrl(value: string, purpose: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`Payment order ${purpose} URL is invalid`);
  }
}
