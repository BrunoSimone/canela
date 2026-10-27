// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MosaicSvg } from "./mosaic-svg";
import { demoDesignCatalog } from "../infrastructure/demo-catalog";
import { dimensions, renderMosaic } from "../domain/design";
import { raster } from "../testing/workshop";

afterEach(cleanup);
describe("PER-136: material preview", () => {
  it("keeps the Murvi matrix and geometry intact with bounded decoration at 45×45", async () => {
    const config = await demoDesignCatalog.configuration();
    const design = renderMosaic(raster(), config, 45);
    const saved = structuredClone(design);
    render(<MosaicSvg design={design} label="Cuadro" />);
    const svg = screen.getByRole("img", { name: "Cuadro" });
    const cells = [...svg.querySelectorAll("[data-cell]")];
    const colors = new Map(config.palette.map(c => [c.id, c.hex]));
    expect(config.palette).toHaveLength(62);
    expect(cells).toHaveLength(2025);
    cells.forEach((cell, i) => {
      expect(cell.getAttribute("fill")).toBe(colors.get(design.cells[i]));
      expect(Number(cell.getAttribute("x"))).toBe(config.frameMm + i % 45 * (config.tileMm + config.groutMm));
      expect(Number(cell.getAttribute("y"))).toBe(config.frameMm + Math.floor(i / 45) * (config.tileMm + config.groutMm));
      expect(Number(cell.getAttribute("width"))).toBe(config.tileMm);
    });
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${dimensions(config, 45).framedMm} ${dimensions(config, 45).framedMm}`);
    expect(svg.querySelector("[data-material-surface]")?.getAttribute("pointer-events")).toBe("none");
    expect(svg.querySelectorAll("*").length - cells.length).toBeLessThan(100);
    expect(svg.querySelectorAll("filter, image, foreignObject, animate")).toHaveLength(0);
    expect(design).toEqual(saved);
  });
  it("isolates material resources between previews, including server rendered markup", async () => {
    const design = renderMosaic(raster(), await demoDesignCatalog.configuration(), 15);
    const markup = renderToStaticMarkup(<><MosaicSvg design={design} label="Primero" /><MosaicSvg design={design} label="Segundo" /></>);
    const document = new DOMParser().parseFromString(markup, "text/html");
    const ids = [...document.querySelectorAll("[id]")].map(el => el.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of document.querySelectorAll("svg")) {
      expect(svg.querySelectorAll("pattern, linearGradient").length).toBeGreaterThan(0);
      for (const el of svg.querySelectorAll("[fill^='url(']")) {
        const id = el.getAttribute("fill")!.slice(5, -1);
        expect([...svg.querySelectorAll("[id]")].some(def => def.id === id)).toBe(true);
      }
    }
  });
});
