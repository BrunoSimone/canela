import { readCheckoutConfig } from "@/modules/checkout/infrastructure/server/checkout-config";
import { quoteShipping } from "@/modules/shipping/application/quote-shipping";
import { createShippingDependencies } from "@/modules/shipping/infrastructure/server/shipping-service";
import { handleShippingQuote } from "@/modules/shipping/presentation/http/quote-handler";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const config = readCheckoutConfig();
    if (config.mode === "disabled" || config.shippingProvider !== "zipnova" || process.env.SITE_MAINTENANCE_MODE === "1") {
      return Response.json({ code: "SHIPPING_DISABLED" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const deps = createShippingDependencies(config.signingSecret);
    return handleShippingQuote(request, { enabled: true, quote: input => quoteShipping(deps, input),
      reportUnexpectedError: () => console.error(JSON.stringify({ event: "shipping_quote_error" })) });
  } catch {
    return Response.json({ code: "SHIPPING_MISCONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
