import { describe, expect, it } from "vitest";
import { demoDesignCatalog } from "./demo-catalog";
import { renderMosaic, resizeDesign, validateWorkshop } from "../domain/design";
import { estimateFrame } from "../domain/estimate";
import { raster } from "../testing/workshop";

describe("PER-131: expanded demonstration palette", () => {
  it("keeps the original colors compatible with existing designs", async () => {
    const config = await demoDesignCatalog.configuration();
    validateWorkshop(config);
    expect(config.provisional).toBe(true);
    expect(config.palette).toHaveLength(32);
    expect(config.palette.slice(0, 10).map(c => [c.id, c.hex])).toEqual([
      ["hueso", "#f1e8d5"], ["arena", "#d7b98a"], ["miel", "#bd8938"],
      ["terracota", "#b96548"], ["rosa", "#dc9c87"], ["oliva", "#778450"],
      ["bosque", "#36594b"], ["cielo", "#a6c5c4"], ["mar", "#477c89"], ["tinta", "#343b40"],
    ]);
    const oldConfig = { ...config, version: "2026-10-26.1", palette: config.palette.slice(0, 10) };
    const oldDesign = renderMosaic(raster(), oldConfig, 15);
    expect(resizeDesign(oldDesign, config, 15).cells).toEqual(oldDesign.cells);
  });
  it.each(["gris-perla", "gris-medio", "gris-carbon", "marfil", "durazno", "siena", "chocolate", "cafe"])("represents %s without shifting it to blue/green", async id => {
    const config = await demoDesignCatalog.configuration();
    const hex = config.palette.find(c => c.id === id)!.hex.slice(1);
    const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    expect(new Set(renderMosaic(raster(4, 4, [...rgb, 255]), config, 15).cells)).toEqual(new Set([id]));
  });
  it("quotes all representative sizes and returns independent server fixtures", async () => {
    const config = await demoDesignCatalog.configuration(), pricing = await demoDesignCatalog.pricing();
    expect([15, 30, 45].map(size => estimateFrame(config, size, pricing).totalCents)).toEqual([4_200_000, 13_200_000, 27_200_000]);
    config.palette[0].hex = "#000000";
    pricing.tilePackCents = 0;
    expect((await demoDesignCatalog.configuration()).palette[0].hex).toBe("#f1e8d5");
    expect((await demoDesignCatalog.pricing()).tilePackCents).toBe(1_391_750);
  });
});
