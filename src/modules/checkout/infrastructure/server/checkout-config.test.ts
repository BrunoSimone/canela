import { describe, expect, it } from "vitest";

import { readCheckoutConfig } from "./checkout-config";

describe("readCheckoutConfig", () => {
  it("keeps checkout disabled when no mode is configured", () => {
    expect(readCheckoutConfig({})).toEqual({ mode: "disabled" });
  });

  it("loads the controlled test mode only with complete server configuration", () => {
    expect(
      readCheckoutConfig({
        CHECKOUT_MODE: "test",
        CHECKOUT_SIGNING_SECRET: "a".repeat(64),
        CHECKOUT_TEST_SHIPPING_CENTS: "400000",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
        MP_ACCESS_TOKEN: "TEST-token",
        DATABASE_URL: "postgresql://database",
      }),
    ).toEqual({
      mode: "test",
      signingSecret: "a".repeat(64),
      shippingCents: 400_000,
      siteUrl: "http://localhost:3000",
      mercadoPagoAccessToken: "TEST-token",
    });
  });

  it.each([
    { CHECKOUT_MODE: "production" },
    { CHECKOUT_MODE: "test" },
    {
      CHECKOUT_MODE: "test",
      CHECKOUT_SIGNING_SECRET: "short",
      CHECKOUT_TEST_SHIPPING_CENTS: "400000",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      MP_ACCESS_TOKEN: "TEST-token",
      DATABASE_URL: "postgresql://database",
    },
    {
      CHECKOUT_MODE: "test",
      CHECKOUT_SIGNING_SECRET: "a".repeat(64),
      CHECKOUT_TEST_SHIPPING_CENTS: "400000",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      MP_ACCESS_TOKEN: "APP_USR-production-token",
      DATABASE_URL: "postgresql://database",
    },
  ])("rejects an unsafe or incomplete enabled mode", (environment) => {
    expect(() => readCheckoutConfig(environment)).toThrow();
  });
});
