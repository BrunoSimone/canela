import { describe, expect, it } from "vitest";
import { dimensions, materialCounts, recolorDesign, renderMosaic, resizeDesign, validateWorkshop } from "./design";
import { raster, testWorkshop as config } from "../testing/workshop";
import { guideHtml } from "./guide";

describe("PER-130: configurable manufacturing geometry", () => {
  it("derives dimensions without treating reported cm as another source of truth", () => {
    expect(dimensions(config, 15)).toEqual({ mosaicMm: 314, framedMm: 334 });
    expect(dimensions({ ...config, tileMm: 22, groutMm: 1, frameMm: 10 }, 15)).toEqual({ mosaicMm: 344, framedMm: 364 });
    expect(dimensions({ ...config, tileMm: 22, groutMm: 1, frameMm: 10 }, 45)).toEqual({ mosaicMm: 1034, framedMm: 1054 });
  });
  it.each([0, 1, 46, 2.5, NaN, Infinity])("rejects invalid cell count %s", size => {
    expect(() => dimensions(config, size)).toThrow();
  });
  it("respects configured increments", () => {
    expect(() => dimensions({ ...config, minCells: 15, step: 5 }, 16)).toThrow();
    expect(dimensions({ ...config, minCells: 15, step: 5 }, 20).mosaicMm).toBe(419);
  });
  it.each([
    { tileMm: 0 }, { groutMm: -1 }, { frameMm: NaN }, { minCells: 46 },
    { maxCells: 10000 }, { step: 0 }, { palette: [] }, { backgroundColorId: "absent" },
    { palette: [config.palette[0], config.palette[0]] },
    { palette: [{ id: "a", name: "Bad", hex: "url(https://evil.invalid)" }] },
  ])("rejects inconsistent or unbounded configuration %j", change => {
    expect(() => validateWorkshop({ ...config, ...change })).toThrow();
  });
});

describe("PER-130: image to physical mosaic", () => {
  it("uses only allowed colors, counts every piece and is deterministic", () => {
    const result = renderMosaic(raster(), config, 3);
    expect(result.cells).toEqual(Array(9).fill("red"));
    expect(materialCounts(result)).toEqual([{ ...config.palette[2], count: 9 }]);
    expect(renderMosaic(raster(), config, 3)).toEqual(result);
  });
  it("composites transparent pixels on the configured background", () => {
    expect(renderMosaic(raster(4, 4, [0, 0, 0, 0]), config, 2).cells).toEqual(Array(4).fill("white"));
  });
  it("samples the selected crop rather than the full image", () => {
    const source = raster(4, 2);
    for (const pixel of [0, 1, 4, 5]) source.data.set([0, 0, 0, 255], pixel * 4);
    expect(renderMosaic(source, config, 2, { x: 0, y: 0, width: 2, height: 2 }).cells).toEqual(Array(4).fill("black"));
    expect(renderMosaic(source, config, 2, { x: 2, y: 0, width: 2, height: 2 }).cells).toEqual(Array(4).fill("red"));
  });
  it.each([{ x: -1, y: 0, width: 2, height: 2 }, { x: 0, y: 0, width: 8, height: 8 }, { x: 0, y: 0, width: 0, height: 0 }])("rejects invalid crop", crop => {
    expect(() => renderMosaic(raster(), config, 2, crop)).toThrow();
  });
  it("rejects truncated raster data", () => {
    expect(() => renderMosaic({ ...raster(), data: new Uint8ClampedArray(3) }, config, 2)).toThrow();
  });
  it("accepts a different palette without changes to the algorithm", () => {
    const next = { ...config, backgroundColorId: "blue", palette: [{ id: "blue", name: "Azul", hex: "#0000ff" }] };
    expect(renderMosaic(raster(), next, 2).cells).toEqual(Array(4).fill("blue"));
  });
});

describe("PER-130: gallery reuse and guide", () => {
  it("resizes and recolors a copy, preserving its source and full piece count", () => {
    const original = renderMosaic(raster(), config, 2);
    const copy = resizeDesign(original, config, 5);
    const recolored = recolorDesign(copy, { red: "black" });
    expect(original.cells).toEqual(Array(4).fill("red"));
    expect(copy.cells).toEqual(Array(25).fill("red"));
    expect(recolored.cells).toEqual(Array(25).fill("black"));
    expect(materialCounts(recolored).reduce((sum, entry) => sum + entry.count, 0)).toBe(25);
  });
  it("does not silently replace a material that is no longer available", () => {
    const original = renderMosaic(raster(), config, 2);
    expect(() => resizeDesign(original, { ...config, palette: config.palette.slice(0, 2) }, 2)).toThrow();
    expect(() => recolorDesign(original, { red: "absent" })).toThrow();
  });
  it("does not depend on mutable workshop configuration", () => {
    const mutable = structuredClone(config);
    const original = renderMosaic(raster(), mutable, 2);
    mutable.tileMm = 50;
    mutable.palette[2].hex = "#000000";
    expect(original.config.tileMm).toBe(20);
    expect(original.config.palette[2].hex).toBe("#ff0000");
  });
  it("exports exactly the selected design, without original image or executable user text", () => {
    const unsafeLabel = { ...config, palette: config.palette.map(c => ({ ...c, name: '<img src=x onerror="alert(1)">' })) };
    const result = renderMosaic(raster(), unsafeLabel, 3);
    const html = guideHtml(result);
    expect(html).toContain("No fabricar");
    expect(html).toContain("3 × 3");
    expect(html).toContain("9 venecitas");
    expect(html.match(/data-cell=/g)).toHaveLength(9);
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("https://");
  });
});
