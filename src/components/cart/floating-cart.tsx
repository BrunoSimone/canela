"use client";

import { useRef } from "react";
import Link from "next/link";
import { CreditCard, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatPrice } from "@/lib/product-status";
import { useCart } from "@/modules/cart/presentation/hooks/use-cart";

export function FloatingCart({ checkoutEnabled }: { checkoutEnabled: boolean }) {
  const { items, count, panelOpen, inc, dec, remove, togglePanel, closePanel } = useCart();
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const hasItems = items.length > 0;
  const canStartCheckout = hasItems && items.every(item => item.checkoutEligible);
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.qty, 0) / 100;
  const quantityClass = "flex size-11 shrink-0 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38]";

  return <>
    <button ref={trigger} type="button" onClick={togglePanel} aria-label={`Mi carrito${count ? `, ${count} ${count === 1 ? "pieza" : "piezas"}` : ""}`} aria-haspopup="dialog" aria-expanded={panelOpen}
      className="fixed bottom-5 right-5 z-[120] flex size-14 items-center justify-center rounded-full bg-[var(--canela-brown)] text-[var(--canela-cream)] shadow-[0_10px_26px_rgba(74,53,39,.35)]">
      <ShoppingBag className="size-6" strokeWidth={1.7} />
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--canela-ochre)] px-1.5 text-xs font-extrabold text-[var(--canela-cream-card)]">{count}</span>}
    </button>
    <Dialog open={panelOpen} onOpenChange={open => { if (!open) closePanel(); }}>
      <DialogContent showCloseButton={false} initialFocus={close} finalFocus={trigger}
        className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-[420px] flex-col gap-0 overflow-hidden rounded-2xl bg-[var(--canela-cream-card)] p-0 sm:max-w-[420px]">
        <div className="flex items-center justify-between border-b border-[rgba(184,132,42,.18)] bg-[#F3E8D2] px-5 py-3">
          <DialogTitle className="font-heading text-3xl">Mi carrito</DialogTitle>
          <button ref={close} type="button" onClick={closePanel} aria-label="Cerrar carrito" className="flex size-11 items-center justify-center text-[#6E4E38]"><X className="size-5" /></button>
        </div>
        <DialogDescription className="sr-only">Revisá las piezas y sus cantidades antes de continuar al checkout.</DialogDescription>
        <div className="min-h-0 overflow-y-auto px-5">
          {hasItems ? items.map(item => <div key={item.id} className="border-b border-[rgba(184,132,42,.16)] py-4 last:border-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="break-words font-bold">{item.name}</p><p className="mt-1 text-sm text-[#6E4E38]">{formatPrice(item.price)} por unidad</p></div>
              <button type="button" onClick={() => { remove(item.id); close.current?.focus(); }} aria-label={`Quitar ${item.name} del carrito`} className="flex size-11 shrink-0 items-center justify-center text-[#7e4b3a]"><X className="size-5" /></button>
            </div>
            {!item.checkoutEligible && <p className="mt-2 text-sm font-bold text-[#7e4b3a]">Sin disponibilidad. Quitá esta pieza para continuar.</p>}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { dec(item.id); if (item.qty === 1) close.current?.focus(); }} aria-label={`Quitar uno de ${item.name}`} className={quantityClass}><Minus className="size-4" /></button>
                <span aria-label={`Cantidad de ${item.name}`} className="min-w-5 text-center font-bold tabular-nums">{item.qty}</span>
                <button type="button" disabled={!item.checkoutEligible} onClick={() => inc(item.id)} aria-label={`Agregar uno de ${item.name}`} className={quantityClass}><Plus className="size-4" /></button>
              </div>
              <strong className="text-[var(--canela-ochre-dark)]">{formatPrice(item.price * item.qty)}</strong>
            </div>
          </div>) : <p className="py-8 text-center text-sm leading-relaxed text-[#6E4E38]">El carrito está vacío. Agregá productos desde el catálogo.</p>}
        </div>
        <div className="shrink-0 border-t border-[rgba(184,132,42,.18)] p-5">
          {hasItems && <><div className="flex justify-between gap-3 font-bold"><span>Subtotal de productos</span><span aria-live="polite">{formatPrice(subtotal)}</span></div><p className="mb-4 mt-2 text-sm text-[#6E4E38]">Calculamos el envío con tu dirección en el siguiente paso.</p></>}
          {checkoutEnabled && canStartCheckout && <Link href="/checkout" onClick={closePanel} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--canela-ochre)] px-4 py-3 text-sm font-extrabold text-[var(--canela-cream-card)]"><CreditCard className="size-4" /> Continuar con la compra</Link>}
          {checkoutEnabled && hasItems && !canStartCheckout && <p className="text-sm leading-relaxed text-[#6E4E38]">Quitá las piezas sin disponibilidad para continuar con la compra.</p>}
          {!checkoutEnabled && hasItems && <p className="text-sm leading-relaxed text-[#6E4E38]">La compra online está pausada. Tu carrito queda guardado para cuando retomemos las ventas.</p>}
          <button type="button" onClick={closePanel} className="mt-3 min-h-11 w-full font-bold text-[#6E4E38]">Seguir eligiendo</button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
