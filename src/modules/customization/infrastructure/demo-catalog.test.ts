import { describe, expect, it } from "vitest";
import { demoDesignCatalog } from "./demo-catalog";
import murvi from "./murvi-palette.json";
import { storefrontColorId } from "./storefront-palette";
import { loadCreator, loadGallery } from "../application/catalog";
import { renderMosaic, resizeDesign, validateDesign, validateWorkshop } from "../domain/design";
import { applyRetouches, emptyRetouches, paintTile, undoRetouch } from "../domain/retouches";
import { estimateFrame } from "../domain/estimate";
import { raster } from "../testing/workshop";

describe("PER-134: manufacturer palette", () => {
  it("uses only the 62 linked references, with traceable estimates and no invented colors", async () => {
    const config = await demoDesignCatalog.configuration();
    validateWorkshop(config);
    expect(config.provisional).toBe(true);
    expect(config.palette).toHaveLength(62);
    expect(new Set(config.palette.map(c => c.id)).size).toBe(62);
    expect(config.palette.map(c => [c.id, c.hex])).toEqual(murvi.colors.map(c => [storefrontColorId(c.id), c.hex]));
    expect(murvi.colors.filter(c => c.line === "Clasico")).toHaveLength(38);
    expect(murvi.colors.filter(c => c.line === "Vitro")).toHaveLength(17);
    expect(murvi.colors.filter(c => c.line === "Nuevo")).toHaveLength(7);
    for (const color of murvi.colors) {
      expect(color.calibrated).toBe(false);
      expect(color.status).toBe("estimated-from-manufacturer-texture");
      expect(color.imageSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(new URL(color.sourceImageUrl).hostname).toBe("www.murvi.com.ar");
      expect(new URL(color.sourceImageUrl).pathname).toBe(`/venecitas/${color.code}.bmp`);
      expect(config.palette.find(c => c.id === storefrontColorId(color.id))?.hex).toBe(color.hex);
    }
    expect(config.palette.filter(c => c.name.includes("transparente"))).toHaveLength(17);
  });
  it.each(murvi.colors)("converts flat $code to its exact material ID", async color => {
    const config = await demoDesignCatalog.configuration();
    expect(new Set(renderMosaic(raster(4, 4, [...color.rgb, 255]), config, 15).cells)).toEqual(new Set([storefrontColorId(color.id)]));
  });
  it("maps arbitrary pixels and alpha only into the allowed materials", async () => {
    const config = await demoDesignCatalog.configuration();
    const source = raster(45, 45);
    for (let i = 0; i < 45 * 45; i++) source.data.set([i * 17 % 256, i * 43 % 256, i * 107 % 256, 255], i * 4);
    const result = renderMosaic(source, config, 45);
    validateDesign(result);
    expect(result.cells).toHaveLength(2025);
    expect(new Set(renderMosaic(raster(4, 4, [0, 0, 0, 0]), config, 15).cells)).toEqual(new Set([config.backgroundColorId]));
  });
  it("preserves manufacturer materials through template resize, retouch and undo", async () => {
    const config = await demoDesignCatalog.configuration();
    for (const template of await demoDesignCatalog.templates()) {
      validateDesign(template.design);
      const resized = resizeDesign(template.design, config, 45);
      expect(resized.config.palette).toEqual(config.palette);
      const history = paintTile(emptyRetouches(), resized, 0, storefrontColorId("murvi-di99"));
      expect(applyRetouches(resized, history.present).cells[0]).toBe(storefrontColorId("murvi-di99"));
      expect(applyRetouches(resized, undoRetouch(history).present)).toEqual(resized);
    }
  });
  it("rejects an incompatible synthetic palette instead of silently changing its material", async () => {
    const config = await demoDesignCatalog.configuration();
    const old = { ...config, backgroundColorId: "hueso", palette: [{ id: "hueso", name: "Hueso", hex: "#f1e8d5" }] };
    const design = renderMosaic(raster(), old, 15);
    expect(() => resizeDesign(design, config, 15)).toThrow("colores que ya no están disponibles");
  });
  it("continues to reject unbounded palettes", async () => {
    const config = await demoDesignCatalog.configuration();
    config.palette = Array.from({ length: 129 }, (_, i) => ({ id: `color-${i}`, name: `Color ${i}`, hex: "#ffffff" }));
    config.backgroundColorId = "color-0";
    expect(() => validateWorkshop(config)).toThrow();
  });
  it("keeps provisional prices and returns independent server fixtures", async () => {
    const config = await demoDesignCatalog.configuration(), pricing = await demoDesignCatalog.pricing();
    expect(pricing.provisional).toBe(true);
    expect([15, 30, 45].map(size => estimateFrame(config, size, pricing).totalCents)).toEqual([4_200_000, 13_200_000, 27_200_000]);
    config.palette[0].hex = "#000000";
    pricing.tilePackCents = 0;
    expect((await demoDesignCatalog.configuration()).palette[0].hex).toBe(murvi.colors[0].hex);
    expect((await demoDesignCatalog.pricing()).tilePackCents).toBe(1_391_750);
  });
});


describe("PER-138: public palette boundary", () => {
  it("never serializes supplier names, codes, source URLs or line names to creator/gallery", async () => {
    const payload = JSON.stringify({
      creator: await loadCreator(demoDesignCatalog, "palmera"),
      gallery: await loadGallery(demoDesignCatalog),
    });
    expect(payload).not.toMatch(/murvi|clasico|vitro|sourceImageUrl|imageSha256/i);
    for (const material of murvi.colors) expect(payload).not.toContain(material.code);
    const config = await demoDesignCatalog.configuration();
    expect(new Set(config.palette.map(c => c.name)).size).toBe(62);
    expect(config.palette.every(c => /^tono-\d{2}$/.test(c.id))).toBe(true);
    expect(config.palette.map(c => c.name).join(" ")).not.toMatch(/tono-\d|#[a-f\d]{6}/i);
  });
  it("keeps stable identities for workshop materials and fails closed for missing mappings", () => {
    expect(storefrontColorId("murvi-b-34")).toBe("tono-25");
    expect(storefrontColorId("murvi-di99")).toBe("tono-62");
    expect(() => storefrontColorId("unregistered-material")).toThrow("referencia pública");
  });
});
