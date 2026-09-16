type MercadoPagoWebhookEnvironment = {
  MP_TEST_ACCESS_TOKEN?: string;
  MP_TEST_WEBHOOK_SECRET?: string;
  MP_TEST_SELLER_USER_ID?: string;
  MP_TEST_APPLICATION_ID?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
};

export type MercadoPagoWebhookConfig = {
  accessToken: string;
  secret: string;
  sellerUserId: string;
  applicationId: string;
  liveMode: false;
};

export function readMercadoPagoWebhookConfig(
  environment: MercadoPagoWebhookEnvironment = process.env,
): MercadoPagoWebhookConfig {
  const accessToken = environment.MP_TEST_ACCESS_TOKEN;
  const secret = environment.MP_TEST_WEBHOOK_SECRET;
  const sellerUserId = environment.MP_TEST_SELLER_USER_ID;
  const applicationId = environment.MP_TEST_APPLICATION_ID;

  if (
    !accessToken ||
    !secret ||
    !sellerUserId ||
    !applicationId ||
    !environment.DATABASE_URL
  ) {
    throw new Error("Mercado Pago webhook configuration is incomplete");
  }
  if (!/^\d+$/.test(sellerUserId) || !/^\d+$/.test(applicationId)) {
    throw new Error("Mercado Pago provider identity is invalid");
  }

  return {
    accessToken,
    secret,
    sellerUserId,
    applicationId,
    liveMode: false,
  };
}
