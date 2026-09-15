import { describe, expect, it } from "vitest";
import type { CreatePaymentOrderInput } from "../../domain/payment-order";
import { buildMercadoPagoOrderPayload } from "./payload";

const input: CreatePaymentOrderInput = {
  idempotencyKey: "fdd5b142-c92a-4d9c-bfa3-7a852fc30bbd",
  externalReference: "CAN-000127",
  payerEmail: "buyer@testuser.com",
  currency: "ARS",
  totalCents: 3_400_000,
  items: [
    {
      externalCode: "sanity-product-id",
      title: "Cuadro Palmera",
      unitPriceCents: 3_000_000,
      quantity: 1,
    },
    {
      externalCode: "shipping-correo-argentino",
      title: "Envío Correo Argentino",
      unitPriceCents: 400_000,
      quantity: 1,
    },
  ],
  notificationUrl: "https://preview.canela.test/api/webhooks/mercado-pago",
  returnUrl: "https://preview.canela.test/checkout/resultado",
};

describe("buildMercadoPagoOrderPayload", () => {
  it("builds the approved Checkout Pro Orders payload", () => {
    expect(buildMercadoPagoOrderPayload(input)).toEqual({
      type: "online",
      processing_mode: "manual",
      capture_mode: "automatic_async",
      total_amount: "34000.00",
      external_reference: "CAN-000127",
      expiration_time: "PT10M",
      payer: { email: "buyer@testuser.com" },
      items: [
        {
          external_code: "sanity-product-id",
          title: "Cuadro Palmera",
          unit_price: "30000.00",
          quantity: 1,
          unit_measure: "unit",
          total_amount: "30000.00",
        },
        {
          external_code: "shipping-correo-argentino",
          title: "Envío Correo Argentino",
          unit_price: "4000.00",
          quantity: 1,
          unit_measure: "unit",
          total_amount: "4000.00",
        },
      ],
      config: {
        notification_url: "https://preview.canela.test/api/webhooks/mercado-pago",
        online: {
          success_url: "https://preview.canela.test/checkout/resultado",
          failure_url: "https://preview.canela.test/checkout/resultado",
          pending_url: "https://preview.canela.test/checkout/resultado",
          auto_return: "all",
        },
        payment_method: { not_allowed_types: ["ticket"] },
      },
    });
  });

  it("rejects a total that differs from the item sum", () => {
    expect(() =>
      buildMercadoPagoOrderPayload({ ...input, totalCents: 1 }),
    ).toThrow("Payment order total does not match its items");
  });

  it("rejects invalid identifiers and item quantities", () => {
    expect(() =>
      buildMercadoPagoOrderPayload({ ...input, externalReference: "x".repeat(65) }),
    ).toThrow();
    expect(() =>
      buildMercadoPagoOrderPayload({
        ...input,
        items: [{ ...input.items[0], quantity: 0 }],
        totalCents: 0,
      }),
    ).toThrow();
  });
});
