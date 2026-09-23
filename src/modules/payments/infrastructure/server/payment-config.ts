type MercadoPagoPaymentEnvironment = {
  MP_TEST_ACCESS_TOKEN?: string;
  MP_TEST_SELLER_USER_ID?: string;
  MP_TEST_APPLICATION_ID?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
};

export type MercadoPagoPaymentConfig = {
  accessToken: string;
  sellerUserId: string;
  applicationId: string;
};

export function readMercadoPagoPaymentConfig(
  environment: MercadoPagoPaymentEnvironment = process.env,
): MercadoPagoPaymentConfig {
  const accessToken = environment.MP_TEST_ACCESS_TOKEN;
  const sellerUserId = environment.MP_TEST_SELLER_USER_ID;
  const applicationId = environment.MP_TEST_APPLICATION_ID;

  if (
    !accessToken ||
    !sellerUserId ||
    !applicationId ||
    !environment.DATABASE_URL
  ) {
    throw new Error("Mercado Pago payment configuration is incomplete");
  }
  if (!/^\d+$/.test(sellerUserId) || !/^\d+$/.test(applicationId)) {
    throw new Error("Mercado Pago provider identity is invalid");
  }

  return { accessToken, sellerUserId, applicationId };
}
