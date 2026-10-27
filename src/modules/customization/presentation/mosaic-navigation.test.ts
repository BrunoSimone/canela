import { describe, expect, it } from "vitest";
import { artSide, centerTile, constrain, fittedView, MosaicGestures, tileAt, zoomAt } from "./mosaic-navigation";
import { dimensions } from "../domain/design";
import { testWorkshop } from "../testing/workshop";
const viewport = { width: 375, height: 450 };
const center = { x: viewport.width / 2, y: viewport.height / 2 };
describe("PER-133: mosaic navigation", () => {
  it("selects the exact cell at every zoom and after pan, including a dense grid", () => {
    for (const size of [3, 15, 45]) for (const scale of [1, 2, 8]) for (const index of [0, Math.floor(size * size / 2), size * size - 1]) {
      const view = centerTile(index, { scale, x: 0, y: 0 }, viewport, testWorkshop, size);
      const mm = dimensions(testWorkshop, size).framedMm;
      const pitch = testWorkshop.tileMm + testWorkshop.groutMm;
      const x = (testWorkshop.frameMm + index % size * pitch + testWorkshop.tileMm / 2) / mm;
      const y = (testWorkshop.frameMm + Math.floor(index / size) * pitch + testWorkshop.tileMm / 2) / mm;
      const point = { x: center.x + view.x + (x - .5) * artSide(viewport) * scale, y: center.y + view.y + (y - .5) * artSide(viewport) * scale };
      expect(tileAt(point, view, viewport, testWorkshop, size)).toBe(index);
    }
  });
  it("does not select frame, outside area or grout", () => {
    const side = artSide(viewport), mm = dimensions(testWorkshop, 3).framedMm;
    const point = (x: number, y: number) => ({ x: center.x + (x / mm - .5) * side, y: center.y + (y / mm - .5) * side });
    expect(tileAt(point(5, 5), fittedView(), viewport, testWorkshop, 3)).toBeNull();
    expect(tileAt(point(30.5, 20), fittedView(), viewport, testWorkshop, 3)).toBeNull();
    expect(tileAt({ x: -100, y: 0 }, fittedView(), viewport, testWorkshop, 3)).toBeNull();
  });
  it("keeps zoom anchored and bounds scale/pan", () => {
    const anchor = { x: 200, y: 240 };
    const view = zoomAt(fittedView(), 4, anchor, viewport);
    expect((anchor.x - center.x - view.x) / view.scale).toBeCloseTo(anchor.x - center.x);
    expect(constrain({ scale: 50, x: 1e9, y: -1e9 }, viewport).scale).toBe(8);
    expect(constrain({ scale: .1, x: 80, y: 90 }, viewport)).toEqual(fittedView());
  });
  it("tap selects but dragging out and back does not", () => {
    const g = new MosaicGestures(viewport); g.down(1, center);
    expect(g.up(1, center)).toEqual(center);
    g.down(1, center); g.move(1, { x: 250, y: 240 }); g.move(1, center);
    expect(g.up(1, center)).toBeNull();
  });
  it("pinches and then lifts both fingers without selecting", () => {
    const g = new MosaicGestures(viewport);
    g.down(1, { x: 150, y: 220 }); g.down(2, { x: 220, y: 220 });
    g.move(2, { x: 290, y: 220 }); expect(g.view.scale).toBeCloseTo(2);
    expect(g.up(2, { x: 290, y: 220 })).toBeNull();
    g.move(1, { x: 145, y: 220 }); expect(g.up(1, { x: 145, y: 220 })).toBeNull();
  });
  it("cancellation, lost capture and resize cannot create an accidental tap", () => {
    const g = new MosaicGestures(viewport); g.down(1, center);
    expect(g.up(1, center, true)).toBeNull(); expect(g.up(1, center)).toBeNull();
    g.down(1, center); g.resize({ width: 800, height: 500 }); expect(g.up(1, center)).toBeNull();
  });
});
