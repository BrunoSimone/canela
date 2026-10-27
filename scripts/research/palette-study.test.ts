import { describe, expect, it } from "vitest";
import { demoDesignCatalog } from "../../src/modules/customization/infrastructure/demo-catalog";
import { additions, colorError, compare, expandedConfig, renderStudySvg } from "./palette-study";
import { renderMosaic, type Raster } from "../../src/modules/customization/domain/design";

describe("PER-135 · comparación de paleta y material", () => {
  it("preserva íntegramente la base Murvi y aísla las hipótesis", async () => {
    const base = await demoDesignCatalog.configuration(), snapshot = structuredClone(base);
    const extra = expandedConfig(base);
    expect(extra.palette.slice(0, 62)).toEqual(base.palette);
    expect(extra.palette).toHaveLength(69);
    expect(new Set(extra.palette.map(c => c.id)).size).toBe(69);
    extra.palette[0].hex = "#000000";
    expect(base).toEqual(snapshot);
    expect(additions.every(c => c.candidate && c.id.startsWith("study-"))).toBe(true);
  });
  it("un nuevo tono exacto reduce a cero su error, sin cambiar geometría", async () => {
    const base = await demoDesignCatalog.configuration();
    const image: Raster = { width: 1, height: 1, data: new Uint8ClampedArray([237,197,170,255]) };
    const result = compare(image, base, 15);
    expect(result.proposed.cells.every(c => c === "study-durazno")).toBe(true);
    expect(result.current.size).toBe(result.proposed.size);
    expect(result.beforeError).toBeGreaterThan(0);
    expect(result.afterError).toBeCloseTo(0, 10);
    expect(result.used.find(c => c.id === "study-durazno")!.count).toBe(225);
  });
  it("la métrica respeta fondo y alfa del mismo algoritmo", async () => {
    const base = await demoDesignCatalog.configuration();
    const transparent: Raster = { width: 1, height: 1, data: new Uint8ClampedArray([255,0,0,0]) };
    expect(colorError(transparent, renderMosaic(transparent, base, 15))).toBeCloseTo(0, 10);
  });
  it("ampliar la paleta no aumenta la distancia digital de una foto", async () => {
    const base = await demoDesignCatalog.configuration();
    const data = Uint8ClampedArray.from({ length: 64*48*4 }, (_, i) => i % 4 === 3 ? 255 : (i * 31 + Math.floor(i / 19)) % 256);
    const image = { width: 64, height: 48, data };
    for (const size of [15, 30, 45]) {
      const result = compare(image, base, size);
      expect(result.afterError).toBeLessThanOrEqual(result.beforeError + 1e-12);
      const allowed = new Set(result.proposed.config.palette.map(c => c.id));
      expect(result.proposed.cells).toHaveLength(size ** 2);
      expect(result.proposed.cells.every(c => allowed.has(c))).toBe(true);
    }
  });
  it("textura y luz conservan cada pieza, son deterministas y no alteran el diseño", async () => {
    const base = await demoDesignCatalog.configuration();
    const design = renderMosaic({ width: 1, height: 1, data: new Uint8ClampedArray([237,197,170,255]) }, expandedConfig(base), 45);
    const saved = structuredClone(design);
    const flat = renderStudySvg(design, "flat"), textured = renderStudySvg(design, "material");
    const cells = (s: string) => [...s.matchAll(/<rect data-cell="(\d+)" data-color="([^"]+)" x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)"/g)].map(m => m.slice(1));
    expect(cells(textured)).toEqual(cells(flat));
    expect(cells(textured)).toHaveLength(2025);
    expect(renderStudySvg(design, "material")).toBe(textured);
    expect(cells(renderStudySvg(design, "material", "right"))).toEqual(cells(flat));
    expect(textured).not.toContain("<image");
    expect(design).toEqual(saved);
  });
});
