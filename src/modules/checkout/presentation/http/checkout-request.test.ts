import { describe, expect, it } from "vitest";
import { testDelivery } from "../../domain/delivery.test-fixture";

import {
  CheckoutRequestValidationError,
  parseCheckoutRequest,
} from "./checkout-request";

describe("parseCheckoutRequest", () => {
  it("accepts product identities, contact, delivery and the signed quote", () => {
    const result = parseCheckoutRequest(
      {
        items: [
          {
            productId: "product-a",
            quantity: 2,
            price: 1,
            name: "Manipulado",
          },
        ],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName, phone: testDelivery.phone },
        delivery: { type: "home", recipientName: testDelivery.recipientName, address: testDelivery },
        shippingQuoteToken: "signed.quote",
        total: 1,
      },
      "97683b2b-6e37-493b-ae7a-271f249ee7db",
    );

    expect(result).toEqual({
      items: [{ productId: "product-a", quantity: 2 }],
      buyerEmail: "buyer@example.com",
      delivery: testDelivery,
      shippingQuoteToken: "signed.quote",
      idempotencyKey: "97683b2b-6e37-493b-ae7a-271f249ee7db",
    });
  });

  it.each([
    [{}, "key"],
    [
      {
        items: [{ productId: "product-a", quantity: 0 }],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName },
        delivery: { type: "home", address: testDelivery },
        shippingQuoteToken: "signed.quote",
      },
      "key",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "invalid", name: testDelivery.buyerName },
        delivery: { type: "home", address: testDelivery },
        shippingQuoteToken: "signed.quote",
      },
      "key",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName },
        delivery: { type: "home", address: testDelivery },
        shippingQuoteToken: "signed.quote",
      },
      "",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName },
        delivery: { type: "home", address: testDelivery },
        shippingQuoteToken: "signed.quote",
      },
      "invalid key with spaces",
    ],
  ])("rejects an invalid request", (body, idempotencyKey) => {
    expect(() => parseCheckoutRequest(body, idempotencyKey)).toThrow(
      CheckoutRequestValidationError,
    );
  });

  it("rejects an unsupported province or postal code before reserving stock", () => {
    for (const address of [
      { ...testDelivery, provinceCode: "?" },
      { ...testDelivery, postalCode: "1900x" },
    ]) {
      expect(() => parseCheckoutRequest({
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName },
        delivery: { type: "home", address },
        shippingQuoteToken: "signed.quote",
      }, "key")).toThrow(CheckoutRequestValidationError);
    }
  });
});
