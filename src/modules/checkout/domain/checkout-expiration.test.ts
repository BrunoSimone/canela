import { describe, expect, it } from "vitest";

import {
  CHECKOUT_EXPIRATION,
  checkoutExpiresAt,
} from "./checkout-expiration";

describe("checkout expiration policy", () => {
  it("uses the same ten-minute window internally and in Mercado Pago", () => {
    const startedAt = new Date("2026-09-24T12:00:00.000Z");

    expect(CHECKOUT_EXPIRATION).toEqual({
      minutes: 10,
      mercadoPagoDuration: "PT10M",
    });
    expect(checkoutExpiresAt(startedAt).toISOString()).toBe(
      "2026-09-24T12:10:00.000Z",
    );
  });
});
