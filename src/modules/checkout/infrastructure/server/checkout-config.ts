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
      mode: "test";
      signingSecret: string;
      shippingCents: number;
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
  if (mode !== "test") {
    throw new Error("Checkout production mode is not available before Correo");
  }

  const signingSecret = environment.CHECKOUT_SIGNING_SECRET;
  const shippingValue = environment.CHECKOUT_TEST_SHIPPING_CENTS;
  const siteUrl = environment.NEXT_PUBLIC_SITE_URL;
  const mercadoPagoAccessToken = environment.MP_TEST_ACCESS_TOKEN;

  if (
    !signingSecret ||
    signingSecret.length < 32 ||
    !shippingValue ||
    !siteUrl ||
    !mercadoPagoAccessToken ||
    !environment.DATABASE_URL
  ) {
    throw new Error("Controlled checkout configuration is incomplete");
  }
  const shippingCents = Number(shippingValue);
  if (!Number.isSafeInteger(shippingCents) || shippingCents < 0) {
    throw new Error("Controlled shipping amount is invalid");
  }

  const parsedSiteUrl = new URL(siteUrl);
  if (!["http:", "https:"].includes(parsedSiteUrl.protocol)) {
    throw new Error("Checkout site URL must use HTTP or HTTPS");
  }

  return {
    mode: "test",
    signingSecret,
    shippingCents,
    siteUrl: parsedSiteUrl.origin,
    mercadoPagoAccessToken,
  };
}
