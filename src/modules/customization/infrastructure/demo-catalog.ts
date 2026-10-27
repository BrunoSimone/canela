import type { DesignCatalog, DesignTemplate } from "../application/catalog";
import type { MosaicDesign, WorkshopConfig } from "../domain/design";
import type { PricingPolicy } from "../domain/estimate";
import murvi from "./murvi-palette.json";

// Server repository fixture. UI receives the same DTO contract a future Sanity
// adapter will supply. Designs are synthetic; material codes come from Murvi.
const config: WorkshopConfig = {
  id: "canela-demo", version: "2026-10-27.murvi-1", provisional: true,
  tileMm: 20, groutMm: 1, frameMm: 10, minCells: 15, maxCells: 45, step: 1,
  backgroundColorId: "murvi-b-34",
  // Digital estimates from manufacturer textures, not physically calibrated HEX.
  // Keep provenance on the server; the browser only needs the palette DTO.
  palette: murvi.colors.map(color => ({
    id: color.id,
    name: `Murvi ${color.code} · ${color.line === "Vitro" ? "Vitro transparente" : color.line === "Clasico" ? "Clásico" : color.line}`,
    hex: color.hex,
  })),
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
      if (y >= 20) return (x + y) % 5 === 0 ? "murvi-e-60" : "murvi-c-06";
      if ((x - 19) ** 2 + (y - 5) ** 2 < 10) return "murvi-e-60";
      const trunk = 12 - Math.floor((y - 9) / 7);
      if (y >= 9 && y < 21 && Math.abs(x - trunk) <= 1) return "murvi-n-07";
      const dx = x - 12;
      if (Math.abs(dx) < 10 && Math.abs(y - (7 + Math.round(Math.abs(dx) * 0.35))) <= 1) return "murvi-o-48";
      if (Math.abs(dx) < 8 && Math.abs(y - (6 - Math.round(Math.abs(dx) * 0.4))) <= 1) return "murvi-n-19";
      if (Math.abs(dx) < 6 && Math.abs(y - (7 + Math.round(Math.abs(dx) * 0.9))) <= 1) return "murvi-o-48";
      return "murvi-c-41";
    }),
    example("atardecer", "El sol sobre el mar", "Una línea de horizonte y colores cálidos.", (x, y) => {
      if (y < 15 && (x - 12) ** 2 + (y - 11) ** 2 <= 36) return "murvi-n-07";
      if (y >= 15) return y % 4 === 0 ? "murvi-c-41" : "murvi-v-20";
      return y < 6 ? "murvi-b-34" : "murvi-r-26";
    }),
    example("jardin", "Flores del jardín", "Pétalos de color sobre un fondo claro.", (x, y) => {
      const flowers = [[7, 7], [17, 11], [9, 17]];
      for (const [cx, cy] of flowers) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= 2) return "murvi-e-60";
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
          if ((x - cx - dx) ** 2 + (y - cy - dy) ** 2 <= 3) return cx === 17 ? "murvi-r-26" : "murvi-n-07";
        }
        if (x === cx && y > cy && y <= cy + 6) return "murvi-o-48";
        if (y === cy + 4 && (x === cx + 1 || x === cx + 2)) return "murvi-n-19";
      }
      return "murvi-b-34";
    }),
  ];
}

export const demoDesignCatalog: DesignCatalog = {
  configuration: async () => structuredClone(config),
  templates: async () => templates(),
  pricing: async () => structuredClone(pricing),
};
