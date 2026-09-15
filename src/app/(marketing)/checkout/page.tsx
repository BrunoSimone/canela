import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { CheckoutConfirmation } from "@/modules/checkout/presentation/components/checkout-confirmation";
import { readCheckoutConfig } from "@/modules/checkout/infrastructure/server/checkout-config";
import { SignedShippingQuoteService } from "@/modules/shipping/infrastructure/signed-shipping-quote";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const checkout = getControlledCheckoutPageData();
  if (!checkout) return <CheckoutUnavailable />;

  return (
    <CheckoutConfirmation
      shippingQuoteToken={checkout.shippingQuoteToken}
      shippingCents={checkout.shippingCents}
      quoteExpiresAt={checkout.quoteExpiresAt}
    />
  );
}

function getControlledCheckoutPageData() {
  try {
    const config = readCheckoutConfig();
    if (config.mode === "disabled") return null;

    const quote = new SignedShippingQuoteService(
      config.signingSecret,
    ).issueControlled(config.shippingCents);

    return {
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
          Compra online en preparación
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed text-[#6E4E38]">
          Mientras terminamos de conectar el envío, podés guardar tus piezas y
          enviarnos la consulta por WhatsApp desde el botón flotante.
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
