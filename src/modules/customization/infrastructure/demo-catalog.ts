import type { DesignCatalog, DesignTemplate } from "../application/catalog";
import type { MosaicDesign, WorkshopConfig } from "../domain/design";
import type { PricingPolicy } from "../domain/estimate";

// Server repository fixture. UI receives the same DTO contract a future Sanity
// adapter will supply. These are synthetic examples, never customer orders.
const config: WorkshopConfig = {
  id: "canela-demo", version: "2026-10-26.2", provisional: true,
  tileMm: 20, groutMm: 1, frameMm: 10, minCells: 15, maxCells: 45, step: 1,
  backgroundColorId: "hueso",
  palette: [
    { id: "hueso", name: "Hueso", hex: "#f1e8d5" },
    { id: "arena", name: "Arena", hex: "#d7b98a" },
    { id: "miel", name: "Miel", hex: "#bd8938" },
    { id: "terracota", name: "Terracota", hex: "#b96548" },
    { id: "rosa", name: "Rosa", hex: "#dc9c87" },
    { id: "oliva", name: "Oliva", hex: "#778450" },
    { id: "bosque", name: "Bosque", hex: "#36594b" },
    { id: "cielo", name: "Cielo", hex: "#a6c5c4" },
    { id: "mar", name: "Mar", hex: "#477c89" },
    { id: "tinta", name: "Tinta", hex: "#343b40" },
    { id: "blanco", name: "Blanco", hex: "#faf9f6" },
    { id: "negro", name: "Negro", hex: "#151414" },
    { id: "gris-perla", name: "Gris perla", hex: "#dedede" },
    { id: "gris-plata", name: "Gris plata", hex: "#bdbdbd" },
    { id: "gris-medio", name: "Gris medio", hex: "#999999" },
    { id: "gris-pizarra", name: "Gris pizarra", hex: "#767676" },
    { id: "gris-grafito", name: "Gris grafito", hex: "#555555" },
    { id: "gris-carbon", name: "Gris carbón", hex: "#2c2c2c" },
    { id: "marfil", name: "Marfil", hex: "#f7e0cf" },
    { id: "durazno", name: "Durazno", hex: "#edc5aa" },
    { id: "beige-rosado", name: "Beige rosado", hex: "#d7af98" },
    { id: "beige-calido", name: "Beige cálido", hex: "#c99b7a" },
    { id: "camel", name: "Camel", hex: "#b98461" },
    { id: "bronce", name: "Bronce", hex: "#a66e4a" },
    { id: "siena", name: "Siena", hex: "#895438" },
    { id: "chocolate", name: "Chocolate", hex: "#633e2c" },
    { id: "cafe", name: "Café", hex: "#3b2821" },
    { id: "rosa-viejo", name: "Rosa viejo", hex: "#d49a91" },
    { id: "arcilla", name: "Arcilla", hex: "#9e7970" },
    { id: "vison", name: "Visón", hex: "#bba59b" },
    { id: "gris-calido", name: "Gris cálido", hex: "#8c8279" },
    { id: "lino", name: "Lino", hex: "#d7cfba" },
  ],
};

// PER-131: indexed Mercado Libre reference (225 tiles / ARS 13,917.50),
// consulted 2026-10-26. Labor/supplies are UI assumptions, not workshop rates.
const pricing: PricingPolicy = {
  version: "demo-prices-2026-10-26.1", currency: "ARS", provisional: true,
  tilePackCents: 1_391_750, tilePackQuantity: 225, roundToCents: 100_000,
  sizes: [
    { cells: 15, laborCents: 2_000_000, suppliesCents: 800_000 },
    { cells: 30, laborCents: 6_000_000, suppliesCents: 1_600_000 },
    { cells: 45, laborCents: 12_000_000, suppliesCents: 2_600_000 },
  ],
};

function example(id: string, title: string, description: string, paint: (x: number, y: number) => string): DesignTemplate {
  const size = 25;
  const design: MosaicDesign = { version: 1, algorithm: "mosaic-oklab-v1", size,
    cells: Array.from({ length: size * size }, (_, i) => paint(i % size, Math.floor(i / size))), config: structuredClone(config) };
  return { id, title, description, published: true, demonstration: true, design };
}

function templates() {
  return [
    example("palmera", "Una tarde bajo la palmera", "Verdes profundos, arena y un cielo sereno.", (x, y) => {
      if (y >= 20) return (x + y) % 5 === 0 ? "miel" : "arena";
      if ((x - 19) ** 2 + (y - 5) ** 2 < 10) return "miel";
      const trunk = 12 - Math.floor((y - 9) / 7);
      if (y >= 9 && y < 21 && Math.abs(x - trunk) <= 1) return "terracota";
      const dx = x - 12;
      if (Math.abs(dx) < 10 && Math.abs(y - (7 + Math.round(Math.abs(dx) * 0.35))) <= 1) return "bosque";
      if (Math.abs(dx) < 8 && Math.abs(y - (6 - Math.round(Math.abs(dx) * 0.4))) <= 1) return "oliva";
      if (Math.abs(dx) < 6 && Math.abs(y - (7 + Math.round(Math.abs(dx) * 0.9))) <= 1) return "bosque";
      return "cielo";
    }),
    example("atardecer", "El sol sobre el mar", "Una línea de horizonte y colores cálidos.", (x, y) => {
      if (y < 15 && (x - 12) ** 2 + (y - 11) ** 2 <= 36) return "terracota";
      if (y >= 15) return y % 4 === 0 ? "cielo" : "mar";
      return y < 6 ? "hueso" : "rosa";
    }),
    example("jardin", "Flores del jardín", "Pétalos de color sobre un fondo claro.", (x, y) => {
      const flowers = [[7, 7], [17, 11], [9, 17]];
      for (const [cx, cy] of flowers) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= 2) return "miel";
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
          if ((x - cx - dx) ** 2 + (y - cy - dy) ** 2 <= 3) return cx === 17 ? "rosa" : "terracota";
        }
        if (x === cx && y > cy && y <= cy + 6) return "bosque";
        if (y === cy + 4 && (x === cx + 1 || x === cx + 2)) return "oliva";
      }
      return "hueso";
    }),
  ];
}

export const demoDesignCatalog: DesignCatalog = {
  configuration: async () => structuredClone(config),
  templates: async () => templates(),
  pricing: async () => structuredClone(pricing),
};
