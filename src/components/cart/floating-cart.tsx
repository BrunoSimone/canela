"use client";

import Link from "next/link";
import { CreditCard, Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatPrice } from "@/lib/product-status";
import { useCart } from "@/modules/cart/presentation/hooks/use-cart";

export function FloatingCart({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const {
    items,
    count,
    panelOpen,
    inc,
    dec,
    remove,
    togglePanel,
    closePanel,
  } = useCart();

  const hasItems = items.length > 0;
  const canStartCheckout =
    hasItems && items.every((item) => item.checkoutEligible);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] h-0">
      <div className="pointer-events-auto absolute bottom-5 right-5 flex flex-col items-end gap-3.5">
        {panelOpen && (
          <div className="flex max-h-[62vh] w-[322px] max-w-[80vw] flex-col overflow-hidden rounded-2xl border border-[rgba(184,132,42,.3)] bg-[var(--canela-cream-card)] shadow-[0_22px_54px_rgba(74,53,39,.3)]">
            <div className="flex items-center justify-between border-b border-[rgba(184,132,42,.18)] bg-[#F3E8D2] px-4 py-3.5">
              <span className="font-heading text-2xl leading-none text-[var(--canela-brown)]">
                Mi carrito
              </span>
              <button
                onClick={togglePanel}
                aria-label="Cerrar"
                className="p-1 text-[#8a7048]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-0.5 overflow-y-auto p-2.5">
              {hasItems ? (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 border-b border-[rgba(184,132,42,.1)] px-2 py-2.5 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[var(--canela-brown)]">
                        {item.name}
                      </div>
                      <div className="text-[13px] font-bold text-[var(--canela-ochre-dark)]">
                        {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        onClick={() => dec(item.id)}
                        aria-label="Quitar uno"
                        className="flex size-6 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38]"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-4 text-center text-sm font-bold text-[var(--canela-brown)]">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => inc(item.id)}
                        aria-label="Agregar uno"
                        className="flex size-6 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38]"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      aria-label="Quitar del carrito"
                      className="flex size-6 flex-none items-center justify-center rounded-lg text-[#b06a52]"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-4 py-7 text-center text-sm leading-relaxed text-[#9a8158]">
                  Todavía no agregaste piezas.
                  <br />
                  Tocá{" "}
                  <b className="text-[var(--canela-ochre-dark)]">
                    “Agregar al carrito”
                  </b>{" "}
                  en las que te gusten.
                </div>
              )}
            </div>

            {hasItems && (
              <div className="border-t border-[rgba(184,132,42,.18)] p-3">
                {checkoutEnabled && canStartCheckout && (
                  <Link
                    href="/checkout"
                    onClick={closePanel}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--canela-ochre)] px-4 py-3 text-sm font-extrabold text-[var(--canela-cream-card)] transition-colors hover:bg-[var(--canela-ochre-dark)]"
                  >
                    <CreditCard className="size-4" />
                    Comprar y pagar online
                  </Link>
                )}
                {checkoutEnabled && !canStartCheckout && (
                  <p className="border-l-2 border-[var(--canela-ochre)] pl-3 text-xs leading-relaxed text-[#6E4E38]">
                    Las piezas por encargo no participan del pago online. Quitalas
                    del carrito para pagar las piezas disponibles.
                  </p>
                )}
                {!checkoutEnabled && (
                  <p className="text-center text-xs leading-relaxed text-[#6E4E38]">
                    La compra online estará disponible cuando terminemos de conectar el envío.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={togglePanel}
          aria-label="Mi carrito"
          className="relative flex size-14 items-center justify-center rounded-full bg-[var(--canela-brown)] text-[var(--canela-cream)] shadow-[0_10px_26px_rgba(74,53,39,.35)]"
        >
          <ShoppingBag className="size-6" strokeWidth={1.7} />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--canela-ochre)] px-1.5 text-xs font-extrabold text-[var(--canela-cream-card)]">
              {count}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
