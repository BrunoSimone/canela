"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useConsulta } from "@/components/consulta/consulta-provider";
import { formatPrice, statusLabel, toneStyle } from "@/lib/product-status";
import type { ProductTone } from "@/lib/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  id: string;
  title: string;
  price: number;
  tone: ProductTone;
  statusNote?: string | null;
  description?: string | null;
  categoryLabel: string;
  sub: string;
  medidas?: string | null;
  material?: string | null;
}

const arrowClass =
  "absolute top-1/2 z-[2] flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(184,132,42,.3)] bg-[rgba(251,247,238,.9)] text-[#6E4E38] shadow-[0_4px_14px_rgba(74,53,39,.16)] transition-colors hover:bg-[#FBF7EE]";

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  id,
  title,
  price,
  tone,
  statusNote,
  description,
  categoryLabel,
  sub,
  medidas,
  material,
}: ImageLightboxProps) {
  const { add, inc, dec, qtyOf } = useConsulta();
  const [shot, setShot] = useState(0);
  const count = images.length;
  const qty = qtyOf(id);
  const inConsulta = qty > 0;
  const toneCol = toneStyle(tone);
  const label = statusLabel(tone, statusNote);
  const hasSpecs = Boolean((medidas && medidas.trim()) || (material && material.trim()));

  // Reset a la primera foto y navegación con flechas del teclado al abrir.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShot(0);
    if (count <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setShot((s) => (s + 1) % count);
      if (e.key === "ArrowLeft") setShot((s) => (s - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count]);

  if (count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-[rgba(58,41,29,.58)] supports-backdrop-filter:backdrop-blur-[7px]"
        className={cn(
          "flex w-[96vw] max-w-[1020px] flex-col gap-0 overflow-hidden rounded-[26px] border border-[rgba(184,132,42,.28)] bg-[#FBF7EE] p-0 ring-0 shadow-[0_34px_80px_rgba(43,30,21,.42)]",
          "min-[860px]:grid min-[860px]:h-[86vh] min-[860px]:grid-cols-[1.04fr_0.96fr] min-[860px]:grid-rows-[minmax(0,1fr)] sm:max-w-[1020px]",
          "max-[859px]:top-0 max-[859px]:h-[100dvh] max-[859px]:max-h-[100dvh] max-[859px]:w-full max-[859px]:max-w-full max-[859px]:translate-y-0 max-[859px]:rounded-none",
        )}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* Galería */}
        <div className="flex min-h-0 min-w-0 flex-col bg-[#EFE4CE] max-[859px]:flex-none">
          <div className="relative min-h-0 flex-1 overflow-hidden max-[859px]:h-[38vh] max-[859px]:flex-none">
            {images.map((url, i) => (
              <div
                key={url}
                className="absolute inset-0 transition-opacity duration-[450ms]"
                style={{ opacity: i === shot ? 1 : 0 }}
              >
                <Image
                  src={url}
                  alt={`${title} — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 860px) 100vw, 540px"
                  className="object-contain"
                  priority={i === 0}
                />
              </div>
            ))}

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setShot((s) => (s - 1 + count) % count)}
                  aria-label="Anterior"
                  className={cn("left-3.5", arrowClass)}
                >
                  <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => setShot((s) => (s + 1) % count)}
                  aria-label="Siguiente"
                  className={cn("right-3.5", arrowClass)}
                >
                  <ChevronRight className="size-[18px]" strokeWidth={2.2} />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="flex shrink-0 justify-center gap-[9px] border-t border-[rgba(184,132,42,.14)] px-4 pb-4 pt-3.5">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setShot(i)}
                  aria-label={`Ver foto ${i + 1}`}
                  className={cn(
                    "relative size-[54px] shrink-0 overflow-hidden rounded-xl transition-opacity",
                    i === shot
                      ? "opacity-100 ring-2 ring-[var(--canela-ochre)]"
                      : "border border-[rgba(184,132,42,.3)] opacity-75 hover:opacity-100",
                  )}
                >
                  <Image src={url} alt="" fill sizes="54px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 pb-6 pt-[30px] max-[859px]:px-5 max-[859px]:pb-[18px] max-[859px]:pt-[22px]">
            <div className="pr-11 text-[11.5px] font-bold uppercase tracking-[.2em] text-[#8A9256]">
              {categoryLabel} · {sub}
            </div>

            <div className="flex flex-col gap-2.5">
              <h3 className="m-0 font-heading text-[40px] font-normal leading-[1.05] text-[var(--canela-brown)]">
                {title}
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[29px] font-extrabold leading-none text-[#8a621d]">
                  {formatPrice(price)}
                </span>
                <span
                  className="inline-flex items-center whitespace-nowrap rounded-full px-[13px] py-1.5 text-xs font-bold"
                  style={{ background: toneCol.bg, color: toneCol.color }}
                >
                  {label}
                </span>
              </div>
            </div>

            {description && description.trim() && (
              <p className="m-0 whitespace-pre-line break-words text-[15.5px] leading-[1.65] text-[#5a4130]">
                {description}
              </p>
            )}

            {hasSpecs && (
              <div className="flex flex-col border-t border-[rgba(184,132,42,.2)]">
                {medidas && medidas.trim() && (
                  <div className="flex items-baseline gap-3.5 border-b border-[rgba(184,132,42,.13)] py-[11px] last:border-0">
                    <span className="w-24 shrink-0 text-[10.5px] font-bold uppercase tracking-[.14em] text-[#9a8158]">
                      Medidas
                    </span>
                    <span className="text-[14.5px] font-semibold text-[var(--canela-brown)]">
                      {medidas}
                    </span>
                  </div>
                )}
                {material && material.trim() && (
                  <div className="flex items-baseline gap-3.5 border-b border-[rgba(184,132,42,.13)] py-[11px] last:border-0">
                    <span className="w-24 shrink-0 text-[10.5px] font-bold uppercase tracking-[.14em] text-[#9a8158]">
                      Material
                    </span>
                    <span className="text-[14.5px] font-semibold text-[var(--canela-brown)]">
                      {material}
                    </span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer: agregar / stepper */}
          <div className="shrink-0 border-t border-[rgba(184,132,42,.2)] bg-[#FBF7EE] px-8 pb-[22px] pt-4 max-[859px]:px-5 max-[859px]:pb-[18px]">
            {inConsulta ? (
              <div className="flex items-center justify-between rounded-[14px] border border-[rgba(184,132,42,.5)] bg-[rgba(184,132,42,.06)] py-2 pl-4 pr-2">
                <span className="text-sm font-bold text-[#6E4E38]">En tu consulta</span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => dec(id)}
                    aria-label="Quitar uno"
                    className="flex size-9 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38] transition-colors hover:bg-[rgba(184,132,42,.12)]"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-5 text-center text-[15px] font-bold text-[var(--canela-brown)]">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => inc(id)}
                    aria-label="Agregar uno"
                    className="flex size-9 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38] transition-colors hover:bg-[rgba(184,132,42,.12)]"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => add({ id, name: title, price })}
                className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-[var(--canela-ochre)] bg-[var(--canela-ochre)] px-4 py-[15px] text-[15px] font-extrabold text-[var(--canela-cream-card)] shadow-[0_8px_20px_rgba(184,132,42,.32)] transition-colors hover:bg-[var(--canela-ochre-dark)]"
              >
                <Plus className="size-4" strokeWidth={2.4} />
                Agregar a mi consulta
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
          className="absolute right-4 top-4 z-[3] flex size-10 items-center justify-center rounded-full border border-[rgba(184,132,42,.3)] bg-[rgba(251,247,238,.92)] text-[#6E4E38] shadow-[0_4px_14px_rgba(74,53,39,.16)] transition-colors hover:bg-[#FBF7EE] hover:text-[var(--canela-brown)]"
        >
          <X className="size-[17px]" strokeWidth={2.2} />
        </button>
      </DialogContent>
    </Dialog>
  );
}
