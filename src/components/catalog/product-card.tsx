"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, Plus } from "lucide-react";

import { useConsulta } from "@/components/consulta/consulta-provider";
import { ImageLightbox } from "@/components/catalog/image-lightbox";
import { formatPrice, statusLabel, toneStyle } from "@/lib/product-status";
import type { ProductTone } from "@/lib/types";

export interface CardProduct {
  id: string;
  name: string;
  price: number;
  sub: string;
  tone: ProductTone;
  statusNote?: string | null;
  imageUrls: string[];
  imgLabel?: string;
  placeholderPattern: string;
}

export function ProductCard({ product }: { product: CardProduct }) {
  const { add, qtyOf } = useConsulta();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const qty = qtyOf(product.id);
  const tone = toneStyle(product.tone);
  const label = statusLabel(product.tone, product.statusNote);
  const inConsulta = qty > 0;

  const cover = product.imageUrls[0] ?? null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-[rgba(184,132,42,.16)] bg-[var(--canela-cream-card)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(74,53,39,.13)]">
      <div
        className="relative flex aspect-[4/5] items-center justify-center"
        style={cover ? undefined : { background: product.placeholderPattern }}
      >
        <span
          className="absolute left-3 top-3 z-10 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold shadow-[0_1px_4px_rgba(74,53,39,.18)]"
          style={{ background: tone.bg, color: tone.color }}
        >
          {label}
        </span>

        {cover ? (
          <>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Ampliar ${product.name}`}
              className="group/img absolute inset-0 cursor-zoom-in"
            >
              <Image
                src={cover}
                alt={product.name}
                fill
                sizes="(max-width: 860px) 50vw, 240px"
                className="object-cover transition-transform duration-500 group-hover/img:scale-[1.04]"
              />
            </button>
            {product.imageUrls.length > 1 && (
              <span className="pointer-events-none absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-[2px]">
                <Images className="size-3" strokeWidth={2.2} />
                {product.imageUrls.length}
              </span>
            )}
            <ImageLightbox
              open={lightboxOpen}
              onOpenChange={setLightboxOpen}
              images={product.imageUrls}
              title={product.name}
            />
          </>
        ) : (
          <span className="font-mono text-xs tracking-wide text-[#9a8158]">
            {`// ${product.imgLabel ?? "foto"}`}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="text-base font-bold leading-tight text-[var(--canela-brown)]">
          {product.name}
        </div>
        <div className="-mt-px text-[19px] font-extrabold text-[var(--canela-ochre-dark)]">
          {formatPrice(product.price)}
        </div>
        <button
          onClick={() => add({ id: product.id, name: product.name, price: product.price })}
          className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-[var(--canela-ochre)] px-3 py-2.5 text-[13.5px] font-bold transition-colors"
          style={
            inConsulta
              ? { background: "var(--canela-ochre)", color: "var(--canela-cream-card)" }
              : { background: "transparent", color: "var(--canela-ochre-dark)" }
          }
        >
          <Plus className="size-[15px]" strokeWidth={2.4} />
          {inConsulta ? `En tu consulta · ${qty}` : "Agregar a mi consulta"}
        </button>
      </div>
    </div>
  );
}
