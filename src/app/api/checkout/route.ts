import { getDatabase } from "@/db/client";
import { SanityProductCatalog } from "@/modules/catalog/infrastructure/sanity/sanity-product-catalog";
import { beginCheckout } from "@/modules/checkout/application/begin-checkout";
import { PostgresCheckoutRepository } from "@/modules/checkout/infrastructure/postgres/checkout-repository";
import { readCheckoutConfig } from "@/modules/checkout/infrastructure/server/checkout-config";
import { handleCheckoutRequest } from "@/modules/checkout/presentation/http/checkout-handler";
import { MercadoPagoClient } from "@/modules/payments/infrastructure/mercado-pago/client";
import { SignedShippingQuoteService } from "@/modules/shipping/infrastructure/signed-shipping-quote";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let config;
  try {
    config = readCheckoutConfig();
  } catch {
    report("checkout_configuration_error");
    return Response.json(
      { code: "CHECKOUT_MISCONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (config.mode === "disabled") {
    return handleCheckoutRequest(request, {
      enabled: false,
      begin: async () => {
        throw new Error("Disabled checkout cannot start");
      },
    });
  }

  const repository = new PostgresCheckoutRepository(getDatabase());
  const payments = new MercadoPagoClient({
    accessToken: config.mercadoPagoAccessToken,
  });
  const catalog = new SanityProductCatalog();
  const quotes = new SignedShippingQuoteService(config.signingSecret);

  return handleCheckoutRequest(request, {
    enabled: true,
    begin: (input) =>
      beginCheckout(
        {
          repository,
          payments,
          catalog,
          quotes,
          signingSecret: config.signingSecret,
          siteUrl: config.siteUrl,
        },
        input,
      ),
    reportUnexpectedError: () => report("checkout_unexpected_error"),
  });
}

function report(event: string): void {
  console.error(JSON.stringify({ event }));
}
