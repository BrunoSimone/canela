import type { CreatePaymentOrderInput } from "../../domain/payment-order";
import { formatArsCents } from "./money";

export type MercadoPagoOrderPayload = {
  type: "online";
  processing_mode: "manual";
  capture_mode: "automatic_async";
  total_amount: string;
  external_reference: string;
  expiration_time: "PT10M";
  payer: { email: string };
  items: Array<{
    external_code: string;
    title: string;
    unit_price: string;
    quantity: number;
    unit_measure: "unit";
    total_amount: string;
  }>;
  config: {
    notification_url: string;
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
    external_code: item.externalCode,
    title: item.title,
    unit_price: formatArsCents(item.unitPriceCents),
    quantity: item.quantity,
    unit_measure: "unit" as const,
    total_amount: formatArsCents(item.unitPriceCents * item.quantity),
  }));

  return {
    type: "online",
    processing_mode: "manual",
    capture_mode: "automatic_async",
    total_amount: formatArsCents(input.totalCents),
    external_reference: input.externalReference,
    expiration_time: "PT10M",
    payer: { email: input.payerEmail },
    items,
    config: {
      notification_url: input.notificationUrl,
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
  validateUrl(input.notificationUrl, "notification");
  validateUrl(input.returnUrl, "return");
}

function validateUrl(value: string, purpose: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`Payment order ${purpose} URL is invalid`);
  }
}
