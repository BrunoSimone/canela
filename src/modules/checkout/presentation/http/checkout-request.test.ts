import { describe, expect, it } from "vitest";

import {
  CheckoutRequestValidationError,
  parseCheckoutRequest,
} from "./checkout-request";

describe("parseCheckoutRequest", () => {
  it("accepts only identities, quantities, buyer email and the signed quote", () => {
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
        buyer: { email: "buyer@example.com" },
        shippingQuoteToken: "signed.quote",
        total: 1,
      },
      "97683b2b-6e37-493b-ae7a-271f249ee7db",
    );

    expect(result).toEqual({
      items: [{ productId: "product-a", quantity: 2 }],
      buyerEmail: "buyer@example.com",
      shippingQuoteToken: "signed.quote",
      idempotencyKey: "97683b2b-6e37-493b-ae7a-271f249ee7db",
    });
  });

  it.each([
    [{}, "key"],
    [
      {
        items: [{ productId: "product-a", quantity: 0 }],
        buyer: { email: "buyer@example.com" },
        shippingQuoteToken: "signed.quote",
      },
      "key",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "invalid" },
        shippingQuoteToken: "signed.quote",
      },
      "key",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "buyer@example.com" },
        shippingQuoteToken: "signed.quote",
      },
      "",
    ],
    [
      {
        items: [{ productId: "product-a", quantity: 1 }],
        buyer: { email: "buyer@example.com" },
        shippingQuoteToken: "signed.quote",
      },
      "invalid key with spaces",
    ],
  ])("rejects an invalid request", (body, idempotencyKey) => {
    expect(() => parseCheckoutRequest(body, idempotencyKey)).toThrow(
      CheckoutRequestValidationError,
    );
  });
});
