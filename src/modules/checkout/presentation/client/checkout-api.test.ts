import { describe, expect, it } from "vitest";

import { buildStartCheckoutRequest } from "./checkout-api";

describe("buildStartCheckoutRequest", () => {
  it("sends only product identities, quantities and the signed quote", () => {
    const request = buildStartCheckoutRequest({
      items: [{ productId: "piece-1", quantity: 2 }],
      buyerEmail: "buyer@example.com",
      shippingQuoteToken: "signed-quote",
      idempotencyKey: "stable-attempt-key",
    });

    expect(request).toEqual({
      url: "/checkout",
      method: "POST",
      headers: { "Idempotency-Key": "stable-attempt-key" },
      body: {
        items: [{ productId: "piece-1", quantity: 2 }],
        buyer: { email: "buyer@example.com" },
        shippingQuoteToken: "signed-quote",
      },
    });
    expect(JSON.stringify(request.body)).not.toMatch(/price|total|name/i);
  });
});
