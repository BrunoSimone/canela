import { describe, expect, it } from "vitest";

import { readMercadoPagoWebhookConfig } from "./webhook-config";

const environment = {
  MP_TEST_ACCESS_TOKEN: "test-access-token",
  MP_TEST_WEBHOOK_SECRET: "test-webhook-secret",
  MP_TEST_SELLER_USER_ID: "123456789",
  MP_TEST_APPLICATION_ID: "987654321",
  DATABASE_URL: "postgresql://user:password@localhost:5432/canela",
};

describe("readMercadoPagoWebhookConfig", () => {
  it("returns an explicit test identity without exposing production mode", () => {
    expect(readMercadoPagoWebhookConfig(environment)).toEqual({
      accessToken: "test-access-token",
      secret: "test-webhook-secret",
      sellerUserId: "123456789",
      applicationId: "987654321",
      liveMode: false,
    });
  });

  it.each([
    "MP_TEST_ACCESS_TOKEN",
    "MP_TEST_WEBHOOK_SECRET",
    "MP_TEST_SELLER_USER_ID",
    "MP_TEST_APPLICATION_ID",
    "DATABASE_URL",
  ] as const)("rejects a missing %s", (key) => {
    expect(() =>
      readMercadoPagoWebhookConfig({ ...environment, [key]: undefined }),
    ).toThrow("Mercado Pago webhook configuration is incomplete");
  });

  it("rejects non-numeric provider identities", () => {
    expect(() =>
      readMercadoPagoWebhookConfig({
        ...environment,
        MP_TEST_SELLER_USER_ID: "seller",
      }),
    ).toThrow("Mercado Pago provider identity is invalid");
  });
});
