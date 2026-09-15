"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { formatPrice } from "@/lib/product-status";
import {
  selectCanStartCheckout,
  selectCartHydrated,
  selectCartItems,
} from "@/modules/cart/presentation/state/cart-slice";
import { useStartCheckoutMutation } from "@/modules/checkout/presentation/client/checkout-api";
import {
  checkoutErrorMessage,
  readCheckoutErrorCode,
  resolveCheckoutNavigation,
} from "@/modules/checkout/presentation/client/checkout-flow";
import { useAppSelector } from "@/store/hooks";

import { MosaicMark } from "./mosaic-mark";

type CheckoutConfirmationProps = {
  shippingQuoteToken: string;
  shippingCents: number;
  quoteExpiresAt: string;
};

export function CheckoutConfirmation({
  shippingQuoteToken,
  shippingCents,
  quoteExpiresAt,
}: CheckoutConfirmationProps) {
  const router = useRouter();
  const items = useAppSelector(selectCartItems);
  const hydrated = useAppSelector(selectCartHydrated);
  const canStartCheckout = useAppSelector(selectCanStartCheckout);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [startCheckout, { isLoading }] = useStartCheckoutMutation();

  const subtotal = items.reduce(
    (total, item) => total + item.price * item.qty,
    0,
  );
  const shipping = shippingCents / 100;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStartCheckout || isLoading) return;

    setErrorMessage(null);
    idempotencyKey.current ??= crypto.randomUUID();

    try {
      const response = await startCheckout({
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.qty,
        })),
        buyerEmail: email,
        shippingQuoteToken,
        idempotencyKey: idempotencyKey.current,
      }).unwrap();
      const navigation = resolveCheckoutNavigation(response);

      if (navigation.kind === "provider") {
        window.location.assign(navigation.url);
      } else {
        router.replace(navigation.path);
      }
    } catch (error) {
      const code = readCheckoutErrorCode(error);
      if (
        code === "CHECKOUT_ATTEMPT_CLOSED" ||
        code === "PAYMENT_PROVIDER_UNAVAILABLE"
      ) {
        idempotencyKey.current = null;
      }
      setErrorMessage(checkoutErrorMessage(code));
    }
  }

  if (!hydrated) {
    return (
      <CheckoutShell>
        <div className="flex min-h-[360px] items-center justify-center gap-3 text-[#6E4E38]">
          <LoaderCircle className="canela-spin size-5" />
          Recuperando tu pedido…
        </div>
      </CheckoutShell>
    );
  }

  if (items.length === 0) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-xl py-16 text-center">
          <PackageCheck className="mx-auto mb-5 size-10 text-[var(--canela-ochre)]" />
          <h1 className="font-heading text-5xl text-[var(--canela-brown)]">
            Tu pedido está vacío
          </h1>
          <p className="mt-3 leading-relaxed text-[#6E4E38]">
            Elegí las piezas que te gusten y volvé cuando quieras confirmar la compra.
          </p>
          <Link
            href="/#catalogo"
            className="mt-7 inline-flex items-center gap-2 border-b border-[var(--canela-ochre)] pb-1 font-bold text-[var(--canela-ochre-dark)]"
          >
            <ArrowLeft className="size-4" />
            Ver productos
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-[rgba(184,132,42,.25)] pb-7">
        <div>
          <Link
            href="/#catalogo"
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-[#6E4E38] hover:text-[var(--canela-ochre-dark)]"
          >
            <ArrowLeft className="size-4" />
            Seguir eligiendo
          </Link>
          <h1 className="font-heading text-5xl leading-none text-[var(--canela-brown)] sm:text-6xl">
            Confirmá tu pedido
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#6E4E38]">
            Revisá las piezas y dejanos un email. El stock se valida nuevamente
            antes de enviarte a Mercado Pago.
          </p>
        </div>
        <div className="hidden sm:block">
          <MosaicMark />
        </div>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section aria-labelledby="order-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2
              id="order-heading"
              className="text-xs font-extrabold uppercase tracking-[.18em] text-[#8A9256]"
            >
              Piezas seleccionadas
            </h2>
            <span className="text-sm text-[#8a7048]">
              {items.reduce((count, item) => count + item.qty, 0)} unidades
            </span>
          </div>

          <div className="border-y border-[rgba(184,132,42,.26)]">
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto] gap-5 border-b border-[rgba(184,132,42,.15)] py-5 last:border-0"
              >
                <div>
                  <h3 className="font-bold text-[var(--canela-brown)]">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#8a7048]">
                    {formatPrice(item.price)} × {item.qty}
                  </p>
                  {!item.checkoutEligible && (
                    <p className="mt-2 text-sm font-bold text-[#9b5944]">
                      Esta pieza se coordina por WhatsApp y no entra al pago online.
                    </p>
                  )}
                </div>
                <strong className="text-right text-[var(--canela-brown)]">
                  {formatPrice(item.price * item.qty)}
                </strong>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="flex gap-3 border-l-2 border-[var(--canela-green)] pl-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--canela-green)]" />
              <p className="text-sm leading-relaxed text-[#6E4E38]">
                Canela relee precio y disponibilidad en el servidor. Una vista
                desactualizada nunca alcanza para vender una pieza agotada.
              </p>
            </div>
            <div className="flex gap-3 border-l-2 border-[var(--canela-ochre)] pl-4">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-[var(--canela-ochre-dark)]" />
              <p className="text-sm leading-relaxed text-[#6E4E38]">
                Al continuar, las piezas quedan reservadas durante 10 minutos
                mientras completás el pago.
              </p>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-24">
          <form
            onSubmit={handleSubmit}
            className="border-t-4 border-[var(--canela-ochre)] bg-[var(--canela-cream-card)] px-6 py-7 shadow-[0_20px_50px_rgba(74,53,39,.13)] sm:px-7"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-extrabold text-[var(--canela-brown)]">
                Resumen
              </h2>
              <span className="rounded-full bg-[#E8F0E2] px-3 py-1 text-xs font-extrabold text-[#4f783f]">
                Entrega a domicilio
              </span>
            </div>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-[#6E4E38]">
                <dt>Productos</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-[#6E4E38]">
                <dt className="flex items-center gap-2">
                  <Truck className="size-4" /> Envío
                </dt>
                <dd>{formatPrice(shipping)}</dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-[rgba(184,132,42,.22)] pt-4">
                <dt className="font-bold text-[var(--canela-brown)]">Total</dt>
                <dd className="text-2xl font-extrabold text-[var(--canela-ochre-dark)]">
                  {formatPrice(subtotal + shipping)}
                </dd>
              </div>
            </dl>

            <label
              htmlFor="buyer-email"
              className="mt-7 block text-sm font-extrabold text-[var(--canela-brown)]"
            >
              Email para el pedido
            </label>
            <input
              id="buyer-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              className="mt-2 w-full border border-[rgba(184,132,42,.42)] bg-white/60 px-3.5 py-3 text-[var(--canela-brown)] outline-none transition-shadow placeholder:text-[#ad9876] focus:ring-2 focus:ring-[rgba(184,132,42,.25)]"
            />
            <p className="mt-2 text-xs leading-relaxed text-[#8a7048]">
              Lo usamos para identificar el pago y avisarte sobre la preparación.
            </p>

            {!canStartCheckout && (
              <p className="mt-5 border-l-2 border-[#b06a52] pl-3 text-sm leading-relaxed text-[#7e4b3a]">
                Quitá las piezas por encargo para continuar. Podés consultarlas por
                WhatsApp desde el botón flotante.
              </p>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-5 border-l-2 border-[#b06a52] pl-3 text-sm leading-relaxed text-[#7e4b3a]"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!canStartCheckout || isLoading}
              className="mt-6 flex w-full items-center justify-center gap-2.5 bg-[var(--canela-ochre)] px-4 py-3.5 font-extrabold text-[var(--canela-cream-card)] shadow-[0_10px_22px_rgba(184,132,42,.24)] transition-colors hover:bg-[var(--canela-ochre-dark)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="canela-spin size-5" />
                  Reservando piezas…
                </>
              ) : (
                <>
                  <CreditCard className="size-5" />
                  Continuar a Mercado Pago
                </>
              )}
            </button>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-[#8a7048]">
              Entorno de prueba · cotización válida hasta{" "}
              {new Intl.DateTimeFormat("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(quoteExpiresAt))}
            </p>
          </form>
        </aside>
      </div>
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[70vh] px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
