"use client";

import { ShoppingBag, Minus, Plus, X } from "lucide-react";

import { useConsulta } from "@/components/consulta/consulta-provider";
import { formatPrice } from "@/lib/product-status";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.24 1.02l-2.2 2.2z" />
    </svg>
  );
}

export function FloatingActions() {
  const {
    items,
    count,
    panelOpen,
    inc,
    dec,
    remove,
    togglePanel,
    consultaWaLink,
    generalWaLink,
  } = useConsulta();

  const hasItems = items.length > 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] h-0">
      <div className="pointer-events-auto absolute bottom-5 right-5 flex flex-col items-end gap-3.5">
        {panelOpen && (
          <div className="flex max-h-[62vh] w-[322px] max-w-[80vw] flex-col overflow-hidden rounded-2xl border border-[rgba(184,132,42,.3)] bg-[var(--canela-cream-card)] shadow-[0_22px_54px_rgba(74,53,39,.3)]">
            <div className="flex items-center justify-between border-b border-[rgba(184,132,42,.18)] bg-[#F3E8D2] px-4 py-3.5">
              <span className="font-heading text-2xl leading-none text-[var(--canela-brown)]">
                Mi consulta
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
                items.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-2.5 border-b border-[rgba(184,132,42,.1)] px-2 py-2.5 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-[var(--canela-brown)]">
                        {i.name}
                      </div>
                      <div className="text-[13px] font-bold text-[var(--canela-ochre-dark)]">
                        {formatPrice(i.price)}
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <button
                        onClick={() => dec(i.id)}
                        aria-label="Quitar uno"
                        className="flex size-6 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[var(--canela-muted-fg,#6E4E38)] text-[#6E4E38]"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-4 text-center text-sm font-bold text-[var(--canela-brown)]">
                        {i.qty}
                      </span>
                      <button
                        onClick={() => inc(i.id)}
                        aria-label="Agregar uno"
                        className="flex size-6 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38]"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      aria-label="Quitar de la consulta"
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
                    “Agregar a mi consulta”
                  </b>{" "}
                  en las que te gusten.
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(184,132,42,.18)] p-3">
              <a
                href={consultaWaLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!hasItems}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--canela-green)] px-4 py-3 text-sm font-bold text-[var(--canela-cream-card)] transition-opacity"
                style={{
                  opacity: hasItems ? 1 : 0.45,
                  pointerEvents: hasItems ? "auto" : "none",
                }}
              >
                <WhatsAppIcon className="size-4" />
                Enviar consulta por WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-col items-end gap-3">
          <button
            onClick={togglePanel}
            aria-label="Mi consulta"
            className="relative flex size-14 items-center justify-center rounded-full bg-[var(--canela-brown)] text-[var(--canela-cream)] shadow-[0_10px_26px_rgba(74,53,39,.35)]"
          >
            <ShoppingBag className="size-6" strokeWidth={1.7} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-[var(--canela-ochre)] px-1.5 text-xs font-extrabold text-[var(--canela-cream-card)]">
                {count}
              </span>
            )}
          </button>
          <a
            href={generalWaLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacto por WhatsApp"
            className="flex size-14 items-center justify-center rounded-full bg-[var(--canela-green)] text-[var(--canela-cream-card)] shadow-[0_10px_26px_rgba(74,53,39,.35)]"
          >
            <WhatsAppIcon className="size-7" />
          </a>
        </div>
      </div>
    </div>
  );
}
