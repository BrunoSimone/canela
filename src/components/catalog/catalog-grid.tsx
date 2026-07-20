"use client";

import { useState } from "react";

import { ProductCard, type CardProduct } from "@/components/catalog/product-card";

interface CatalogGridProps {
  subs: string[];
  products: CardProduct[];
}

export function CatalogGrid({ subs, products }: CatalogGridProps) {
  const [active, setActive] = useState(subs[0] ?? "Todos");

  const filtered =
    active === "Todos" ? products : products.filter((p) => p.sub === active);

  return (
    <>
      <div className="mb-6 flex gap-2.5 overflow-x-auto pb-1.5">
        {subs.map((label) => {
          const isActive = label === active;
          return (
            <button
              key={label}
              onClick={() => setActive(label)}
              className="flex-none whitespace-nowrap rounded-full px-[18px] py-2.5 text-sm transition-colors"
              style={
                isActive
                  ? {
                      border: "1px solid var(--canela-ochre)",
                      background: "var(--canela-ochre)",
                      color: "var(--canela-cream-card)",
                      fontWeight: 700,
                    }
                  : {
                      border: "1px solid rgba(184,132,42,.5)",
                      background: "transparent",
                      color: "#6E4E38",
                      fontWeight: 600,
                    }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6 md:grid-cols-[repeat(auto-fill,minmax(238px,1fr))]">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--canela-muted-foreground,#6E4E38)] text-[#6E4E38]">
          No hay piezas en esta categoría por ahora.
        </p>
      )}
    </>
  );
}
