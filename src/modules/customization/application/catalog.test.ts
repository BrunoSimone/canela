import { describe, expect, it } from "vitest";
import { loadCreator, loadGallery, type DesignCatalog } from "./catalog";
import { renderMosaic } from "../domain/design";
import { testWorkshop, raster } from "../testing/workshop";
import { customizationEnabled } from "../infrastructure/availability";

const design = () => renderMosaic(raster(), testWorkshop, 3);
const repository = (): DesignCatalog => ({
  configuration: async () => structuredClone(testWorkshop),
  templates: async () => [
    { id: "public", title: "Público", description: "Ejemplo", published: true, demonstration: true, design: design() },
    { id: "hidden", title: "Oculto", description: "", published: false, demonstration: true, design: design() },
  ],
});
describe("PER-130: server supplied gallery and creator", () => {
  it("exposes only published templates", async () => {
    expect((await loadGallery(repository())).templates.map(t => t.id)).toEqual(["public"]);
  });
  it("loads a published template without needing the original image", async () => {
    expect((await loadCreator(repository(), "public")).template?.design.cells).toHaveLength(9);
  });
  it("uses updated workshop dimensions in both routes without mutating the stored template", async () => {
    const stored = await repository().templates();
    const config = { ...testWorkshop, version: "confirmed", tileMm: 22, frameMm: 15 };
    const repo = { configuration: async () => config, templates: async () => stored };
    const gallery = await loadGallery(repo);
    const creator = await loadCreator(repo, "public");
    expect(gallery.templates[0].design.config).toEqual(config);
    expect(creator.template?.design.config).toEqual(config);
    expect(gallery.templates[0].design.cells).toEqual(stored[0].design.cells);
    expect(stored[0].design.config).toEqual(testWorkshop);
  });
  it.each(["hidden", "missing", "../../private"])("handles %s without exposing a private design", async id => {
    const result = await loadCreator(repository(), id);
    expect(result.template).toBeNull();
    expect(result.templateUnavailable).toBe(true);
  });
  it("handles an empty gallery", async () => {
    expect((await loadGallery({ ...repository(), templates: async () => [] })).templates).toEqual([]);
  });
  it("starts without a selected image/template when no id was provided", async () => {
    expect((await loadCreator(repository())).templateUnavailable).toBe(false);
    expect((await loadCreator(repository())).template).toBeNull();
  });
  it("never enables demonstration routes in Vercel production", () => {
    expect(customizationEnabled({ NODE_ENV: "production", VERCEL_ENV: "production", CUADROS_PREVIEW_ENABLED: "1" })).toBe(false);
    expect(customizationEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(customizationEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(customizationEnabled({ NODE_ENV: "development", CUADROS_PREVIEW_ENABLED: "0" })).toBe(false);
    expect(customizationEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview", CUADROS_PREVIEW_ENABLED: "1" })).toBe(true);
  });
});
