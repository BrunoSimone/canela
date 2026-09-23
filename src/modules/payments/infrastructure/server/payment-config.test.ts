import { describe, expect, it } from "vitest";

import { readMercadoPagoPaymentConfig } from "./payment-config";

const environment = {
  MP_TEST_ACCESS_TOKEN: "test-access-token",
  MP_TEST_SELLER_USER_ID: "123456789",
  MP_TEST_APPLICATION_ID: "987654321",
  DATABASE_URL: "postgresql://user:password@localhost:5432/canela",
};

describe("readMercadoPagoPaymentConfig", () => {
  it("reads only the server-side identity required to query payments", () => {
    expect(readMercadoPagoPaymentConfig(environment)).toEqual({
      accessToken: "test-access-token",
      sellerUserId: "123456789",
      applicationId: "987654321",
    });
  });

  it.each([
    "MP_TEST_ACCESS_TOKEN",
    "MP_TEST_SELLER_USER_ID",
    "MP_TEST_APPLICATION_ID",
    "DATABASE_URL",
  ] as const)("rejects a missing %s", (key) => {
    expect(() =>
      readMercadoPagoPaymentConfig({ ...environment, [key]: undefined }),
    ).toThrow("Mercado Pago payment configuration is incomplete");
  });
});
