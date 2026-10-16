import { paymentEnvironment, paymentCredentialPrefix } from "./payment-environment";
type MercadoPagoPaymentEnvironment = {
  MP_TEST_ACCESS_TOKEN?: string;
  MP_TEST_SELLER_USER_ID?: string;
  MP_TEST_APPLICATION_ID?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
};

export type MercadoPagoPaymentConfig = {
  environment: "test" | "production";
  accessToken: string;
  sellerUserId: string;
  applicationId: string;
};

export function readMercadoPagoPaymentConfig(
  environment: MercadoPagoPaymentEnvironment = process.env,
): MercadoPagoPaymentConfig {
  const prefix=paymentCredentialPrefix(environment);
  const accessToken = environment[`${prefix}_ACCESS_TOKEN`];
  const sellerUserId = environment[`${prefix}_SELLER_USER_ID`];
  const applicationId = environment[`${prefix}_APPLICATION_ID`];

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

  return { accessToken, sellerUserId, applicationId, environment: paymentEnvironment(environment) };
}
