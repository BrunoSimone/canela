import { readCheckoutConfig } from "@/modules/checkout/infrastructure/server/checkout-config";
import { quoteShipping } from "@/modules/shipping/application/quote-shipping";
import { createShippingDependencies } from "@/modules/shipping/infrastructure/server/shipping-service";
import { handleShippingQuote } from "@/modules/shipping/presentation/http/quote-handler";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const config = readCheckoutConfig();
    // During maintenance only an authenticated panel preview may quote; it never creates orders or charges.
    const paused = process.env.SITE_MAINTENANCE_MODE === "1" && !(await currentAdminSession().catch(() => null));
    if (config.mode === "disabled" || config.shippingProvider !== "zipnova" || paused) {
      return Response.json({ code: "SHIPPING_DISABLED" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const deps = createShippingDependencies(config.signingSecret);
    return handleShippingQuote(request, { enabled: true, quote: input => quoteShipping(deps, input),
      reportUnexpectedError: () => console.error(JSON.stringify({ event: "shipping_quote_error" })) });
  } catch {
    return Response.json({ code: "SHIPPING_MISCONFIGURED" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
