import { describe, expect, it, vi } from "vitest";

import { CheckoutStartUncertainError } from "../../application/begin-checkout";
import { InvalidCheckoutItemsError, ProductNotSellableError } from "../../application/resolve-checkout-items";
import { PaymentProviderUnavailableError } from "../../application/start-checkout";
import {
  CheckoutAttemptClosedError,
  CheckoutInventoryUnavailableError,
} from "../../domain/checkout";
import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
} from "../../../shipping/domain/shipping-quote";
import { handleCheckoutRequest } from "./checkout-handler";

function request(body: unknown = validBody()): Request {
  return new Request("https://canela.test/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": "97683b2b-6e37-493b-ae7a-271f249ee7db",
    },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    items: [{ productId: "product-a", quantity: 1 }],
    buyer: { email: "buyer@example.com" },
    shippingQuoteToken: "signed.quote",
  };
}

describe("handleCheckoutRequest", () => {
  it("returns the redirect contract after a successful checkout start", async () => {
    const begin = vi.fn().mockResolvedValue({
      orderToken: "public-token",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      expiresAt: new Date("2026-09-15T16:10:00.000Z"),
      reused: false,
    });

    const response = await handleCheckoutRequest(request(), {
      enabled: true,
      begin,
    });

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      orderToken: "public-token",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      expiresAt: "2026-09-15T16:10:00.000Z",
    });
    expect(begin).toHaveBeenCalledWith({
      items: [{ productId: "product-a", quantity: 1 }],
      buyerEmail: "buyer@example.com",
      shippingQuoteToken: "signed.quote",
      idempotencyKey: "97683b2b-6e37-493b-ae7a-271f249ee7db",
    });
  });

  it("does not parse or execute checkout while the flag is disabled", async () => {
    const begin = vi.fn();
    const response = await handleCheckoutRequest(request({ invalid: true }), {
      enabled: false,
      begin,
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ code: "CHECKOUT_DISABLED" });
    expect(begin).not.toHaveBeenCalled();
  });

  it.each([
    [new InvalidCheckoutItemsError("invalid"), 422, "INVALID_CHECKOUT"],
    [new InvalidShippingQuoteError(), 422, "SHIPPING_QUOTE_INVALID"],
    [new ExpiredShippingQuoteError(), 409, "SHIPPING_QUOTE_EXPIRED"],
    [new ProductNotSellableError(["a"]), 422, "PRODUCT_NOT_SELLABLE"],
    [new CheckoutInventoryUnavailableError(["a"]), 409, "OUT_OF_STOCK"],
    [new CheckoutAttemptClosedError(), 409, "CHECKOUT_ATTEMPT_CLOSED"],
    [new PaymentProviderUnavailableError(), 502, "PAYMENT_PROVIDER_UNAVAILABLE"],
  ] as const)("maps a known failure to HTTP %s", async (error, status, code) => {
    const response = await handleCheckoutRequest(request(), {
      enabled: true,
      begin: vi.fn().mockRejectedValue(error),
    });

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ code });
  });

  it("returns the order token but no redirect for an uncertain provider result", async () => {
    const response = await handleCheckoutRequest(request(), {
      enabled: true,
      begin: vi
        .fn()
        .mockRejectedValue(new CheckoutStartUncertainError("public-token")),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      code: "PAYMENT_PROVIDER_UNCERTAIN",
      orderToken: "public-token",
    });
  });

  it("rejects malformed JSON before invoking the use case", async () => {
    const begin = vi.fn();
    const malformed = new Request("https://canela.test/api/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": "attempt-key" },
      body: "{",
    });

    const response = await handleCheckoutRequest(malformed, {
      enabled: true,
      begin,
    });

    expect(response.status).toBe(422);
    expect(begin).not.toHaveBeenCalled();
  });
});
