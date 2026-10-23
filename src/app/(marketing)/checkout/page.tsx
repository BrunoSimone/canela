import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { CheckoutConfirmation } from "@/modules/checkout/presentation/components/checkout-confirmation";
import { readCheckoutConfig } from "@/modules/checkout/infrastructure/server/checkout-config";
import { readShippingConfig } from "@/modules/shipping/infrastructure/server/shipping-config";
import { SignedShippingQuoteService } from "@/modules/shipping/infrastructure/signed-shipping-quote";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const checkout = getControlledCheckoutPageData();
  if (!checkout) return <CheckoutUnavailable />;

  return (
    <CheckoutConfirmation shipping={checkout} environment={checkout.environment} />
  );
}

function getControlledCheckoutPageData() {
  try {
    const config = readCheckoutConfig();
    if (config.mode === "disabled") return null;

    if (config.shippingProvider === "zipnova") {
      readShippingConfig();
      return { kind: "zipnova" as const, environment: config.mode };
    }
    const quote = new SignedShippingQuoteService(
      config.signingSecret,
    ).issueControlled(config.shippingCents);

    return {
      kind: "controlled_test" as const,
      environment: config.mode,
      shippingQuoteToken: quote.token,
      shippingCents: quote.amountCents,
      quoteExpiresAt: quote.expiresAt.toISOString(),
    };
  } catch {
    return null;
  }
}

function CheckoutUnavailable() {
  return (
    <div className="min-h-[70vh] px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl border-y border-[rgba(184,132,42,.25)] py-14 text-center">
        <MessageCircle className="mx-auto size-10 text-[var(--canela-green)]" />
        <h1 className="mt-6 font-heading text-5xl text-[var(--canela-brown)]">
          Compra online pausada
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed text-[#6E4E38]">
          Por el momento no estamos recibiendo nuevas compras. Tu carrito queda
          guardado para cuando retomemos las ventas.
        </p>
        <Link
          href="/#catalogo"
          className="mt-8 inline-flex items-center gap-2 border-b border-[var(--canela-ochre)] pb-1 font-bold text-[var(--canela-ochre-dark)]"
        >
          <ArrowLeft className="size-4" />
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
