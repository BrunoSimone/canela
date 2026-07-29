"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ProductCard, type CardProduct } from "@/components/catalog/product-card";

const PAGE_SIZE = 12;

interface CatalogGridProps {
  subs: string[];
  products: CardProduct[];
}

export function CatalogGrid({ subs, products }: CatalogGridProps) {
  const [active, setActive] = useState(subs[0] ?? "Todos");
  const [page, setPage] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const filtered =
    active === "Todos" ? products : products.filter((p) => p.sub === active);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  function selectFilter(label: string) {
    setActive(label);
    setPage(0);
  }

  function changePage(next: number) {
    if (next < 0 || next >= pageCount) return;
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <div className="mb-6 flex gap-2.5 overflow-x-auto pb-1.5">
        {subs.map((label) => {
          const isActive = label === active;
          return (
            <button
              key={label}
              onClick={() => selectFilter(label)}
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
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6 md:grid-cols-[repeat(auto-fill,minmax(238px,1fr))]">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav
              aria-label="Paginación"
              className="mt-9 flex items-center justify-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page === 0}
                aria-label="Página anterior"
                className="flex size-9 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38] transition-colors hover:bg-[rgba(184,132,42,.1)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>

              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => changePage(i)}
                  aria-current={i === page ? "page" : undefined}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg text-sm font-bold transition-colors",
                    i === page
                      ? "bg-[var(--canela-ochre)] text-[var(--canela-cream-card)]"
                      : "border border-[rgba(184,132,42,.5)] text-[#6E4E38] hover:bg-[rgba(184,132,42,.1)]",
                  )}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page === pageCount - 1}
                aria-label="Página siguiente"
                className="flex size-9 items-center justify-center rounded-lg border border-[rgba(184,132,42,.5)] text-[#6E4E38] transition-colors hover:bg-[rgba(184,132,42,.1)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </nav>
          )}
        </>
      ) : (
        <p className="py-8 text-center text-sm text-[var(--canela-muted-foreground,#6E4E38)] text-[#6E4E38]">
          No hay piezas en esta categoría por ahora.
        </p>
      )}
    </div>
  );
}
