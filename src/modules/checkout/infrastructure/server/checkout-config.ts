import { readShippingConfig } from "@/modules/shipping/infrastructure/server/shipping-config";
import { readOrderMailConfig } from "@/modules/notifications/infrastructure/mail-config";
import { paymentEnvironment } from "@/modules/payments/infrastructure/server/payment-environment";
import { readMercadoPagoWebhookConfig } from "@/modules/payments/infrastructure/server/webhook-config";
type CheckoutEnvironment = {
  CHECKOUT_MODE?: string;
  CHECKOUT_SIGNING_SECRET?: string;
  CHECKOUT_TEST_SHIPPING_CENTS?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  MP_TEST_ACCESS_TOKEN?: string;
  DATABASE_URL?: string;
  [key: string]: string | undefined;
};

export type CheckoutConfig =
  | { mode: "disabled" }
  | {
      mode: "test" | "production";
      signingSecret: string;
      shippingCents: number;
      shippingProvider: "controlled_test" | "zipnova";
      siteUrl: string;
      mercadoPagoAccessToken: string;
    };

export function readCheckoutConfig(
  environment: CheckoutEnvironment = process.env,
): CheckoutConfig {
  const mode = environment.CHECKOUT_MODE ?? "disabled";
  if (mode === "disabled") {
    return { mode: "disabled" };
  }
  if (mode !== "test" && mode !== "production") {
    throw new Error("Invalid checkout mode");
  }

  if (mode !== paymentEnvironment(environment)) throw Error("Checkout and payment environments differ");
  if (mode === "production") {
    if (environment.COMMERCE_PRODUCTION_APPROVED !== "1" || environment.SHIPPING_PROVIDER !== "zipnova" || environment.ZIPNOVA_FULFILLMENT_MODE !== "production") throw Error("Production commerce is not approved");
    const shipping = readShippingConfig(environment);
    if (shipping.accountMode !== "operational" || shipping.dispatchType !== "carrier_dropoff" || shipping.maxParcels !== 1) throw Error("Production shipping is not ready");
    if (readOrderMailConfig(environment)?.environment !== "production") throw Error("Production notices are not ready");
    readMercadoPagoWebhookConfig(environment);
  }
  const signingSecret = environment.CHECKOUT_SIGNING_SECRET;
  const shippingProvider = environment.SHIPPING_PROVIDER ?? "controlled_test";
  if (shippingProvider !== "controlled_test" && shippingProvider !== "zipnova") throw new Error("Invalid shipping provider");
  const shippingValue = shippingProvider === "controlled_test" ? environment.CHECKOUT_TEST_SHIPPING_CENTS : "0";
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL;
  const mercadoPagoAccessToken = mode === "production" ? environment.MP_PRODUCTION_ACCESS_TOKEN : environment.MP_TEST_ACCESS_TOKEN;

  if (
    !signingSecret ||
    signingSecret.length < 32 ||
    !shippingValue ||
    !siteUrl ||
    !mercadoPagoAccessToken ||
    !environment.DATABASE_URL
  ) {
    throw new Error("Checkout configuration is incomplete");
  }
  const shippingCents = Number(shippingValue);
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) {
    throw new Error("Controlled shipping amount is invalid");
  }

  const parsedSiteUrl = new URL(siteUrl);
  if (parsedSiteUrl.username || parsedSiteUrl.password || (mode === "production" && parsedSiteUrl.protocol !== "https:") || !["http:", "https:"].includes(parsedSiteUrl.protocol)) {
    throw new Error("Checkout site URL must use HTTP or HTTPS");
  }

  return {
    mode,
    signingSecret,
    shippingCents,
    shippingProvider,
    siteUrl: parsedSiteUrl.origin,
    mercadoPagoAccessToken,
  };
}
