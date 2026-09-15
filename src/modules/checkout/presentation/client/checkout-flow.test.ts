import { describe, expect, it } from "vitest";

import {
  checkoutErrorMessage,
  presentCheckoutResult,
  resolveCheckoutNavigation,
  shouldClearCart,
} from "./checkout-flow";

describe("checkout client flow", () => {
  it("redirects a created checkout to the provider URL", () => {
    expect(
      resolveCheckoutNavigation({
        orderToken: "public-token",
        checkoutUrl: "https://mercadopago.com/checkout",
        expiresAt: "2026-09-15T18:00:00.000Z",
      }),
    ).toEqual({
      kind: "provider",
      url: "https://mercadopago.com/checkout",
    });
  });

  it("sends an uncertain creation to internal verification instead of a second payment", () => {
    expect(
      resolveCheckoutNavigation({
        code: "PAYMENT_PROVIDER_UNCERTAIN",
        orderToken: "public-token",
      }),
    ).toEqual({
      kind: "status",
      path: "/checkout/resultado/public-token",
    });
  });

  it("gives actionable messages for expected checkout errors", () => {
    expect(checkoutErrorMessage("OUT_OF_STOCK")).toContain("ya no está disponible");
    expect(checkoutErrorMessage("SHIPPING_QUOTE_EXPIRED")).toContain("Actualizá");
    expect(checkoutErrorMessage("PAYMENT_PROVIDER_UNAVAILABLE")).toContain("intentar");
  });

  it("does not invite another payment while verification is pending", () => {
    const verifying = presentCheckoutResult("verifying");
    const review = presentCheckoutResult("review_required");

    expect(verifying.allowNewAttempt).toBe(false);
    expect(verifying.description).toContain("no vuelvas a pagar");
    expect(review.allowNewAttempt).toBe(false);
    expect(review.description).toContain("no vuelvas a pagar");
  });

  it("clears the cart only after Canela reports a paid order", () => {
    expect(shouldClearCart("verifying")).toBe(false);
    expect(shouldClearCart("not_completed")).toBe(false);
    expect(shouldClearCart("review_required")).toBe(false);
    expect(shouldClearCart("paid")).toBe(true);
  });
});
