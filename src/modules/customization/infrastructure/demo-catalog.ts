import type { DesignCatalog, DesignTemplate } from "../application/catalog";
import type { MosaicDesign, WorkshopConfig } from "../domain/design";

// Server repository fixture. UI receives the same DTO contract a future Sanity
// adapter will supply. These are synthetic examples, never customer orders.
const config: WorkshopConfig = {
  id: "canela-demo", version: "2026-10-26.1", provisional: true,
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
};
