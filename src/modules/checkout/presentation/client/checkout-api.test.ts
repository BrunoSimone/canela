import { describe, expect, it } from "vitest";
import { testDelivery } from "../../domain/delivery.test-fixture";

import {
  buildReconcilePublicOrderRequest,
  buildStartCheckoutRequest,
} from "./checkout-api";

describe("buildStartCheckoutRequest", () => {
  it("sends only product identities, quantities and the signed quote", () => {
    const request = buildStartCheckoutRequest({
      items: [{ productId: "piece-1", quantity: 2 }],
      buyerEmail: "buyer@example.com",
      delivery: testDelivery,
      shippingQuoteToken: "signed-quote",
      idempotencyKey: "stable-attempt-key",
    });

    expect(request).toEqual({
      url: "/checkout",
      method: "POST",
      headers: { "Idempotency-Key": "stable-attempt-key" },
      body: {
        items: [{ productId: "piece-1", quantity: 2 }],
        buyer: { email: "buyer@example.com", name: testDelivery.buyerName, phone: testDelivery.phone },
        delivery: {
          type: "home",
          recipientName: testDelivery.recipientName,
          address: {
            streetName: testDelivery.streetName,
            streetNumber: testDelivery.streetNumber,
            floor: testDelivery.floor,
            apartment: testDelivery.apartment,
            city: testDelivery.city,
            provinceCode: testDelivery.provinceCode,
            postalCode: testDelivery.postalCode,
          },
        },
        shippingQuoteToken: "signed-quote",
      },
    });
    expect(JSON.stringify(request.body)).not.toMatch(/price|total/i);
  });

  it("reconciles only by opaque public token without browser payment data", () => {
    expect(buildReconcilePublicOrderRequest("public/token")).toEqual({
      url: "/orders/public%2Ftoken/reconcile",
      method: "POST",
    });
  });
});
