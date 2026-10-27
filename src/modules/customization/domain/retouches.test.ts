import { describe, expect, it } from "vitest";
import { applyRetouches, emptyRetouches, paintTile, restoreTile, undoRetouch, redoRetouch } from "./retouches";
import { renderMosaic, recolorDesign } from "./design";
import { testWorkshop, raster } from "../testing/workshop";
const base = () => renderMosaic(raster(), testWorkshop, 3);
describe("PER-133: per-tile edits", () => {
  it("changes just one tile without mutating its source", () => {
    const design = base(); const edits = paintTile(emptyRetouches(), design, 4, "black");
    expect(applyRetouches(design, edits.present).cells).toEqual(["red", "red", "red", "red", "black", "red", "red", "red", "red"]);
    expect(design.cells.every(c => c === "red")).toBe(true);
  });
  it("undoes, redoes and restores a tile", () => {
    const design = base(); let edits = paintTile(emptyRetouches(), design, 2, "black");
    edits = paintTile(edits, design, 5, "white");
    expect(undoRetouch(edits).present).toEqual({ 2: "black" });
    expect(redoRetouch(undoRetouch(edits))).toEqual(edits);
    const restored = restoreTile(edits, design, 2);
    expect(applyRetouches(design, restored.present).cells[2]).toBe("red");
    expect(undoRetouch(restored).present).toEqual(edits.present);
  });
  it("drops redo after a new edit and ignores identical colors", () => {
    const design = base(); const edited = paintTile(emptyRetouches(), design, 0, "black");
    expect(paintTile(edited, design, 0, "black")).toBe(edited);
    const changed = paintTile(undoRetouch(edited), design, 1, "white");
    expect(changed.future).toHaveLength(0); expect(redoRetouch(changed)).toBe(changed);
  });
  it("retains manual choices after global recolor and restores to the current generated color", () => {
    const design = base(); const edits = paintTile(emptyRetouches(), design, 0, "white");
    const global = recolorDesign(design, { red: "black" });
    expect(applyRetouches(global, edits.present).cells.slice(0, 2)).toEqual(["white", "black"]);
    expect(applyRetouches(global, restoreTile(edits, global, 0).present).cells[0]).toBe("black");
  });
  it.each([-1, 9, 1.5, NaN])("rejects invalid cell %s", index => {
    expect(() => paintTile(emptyRetouches(), base(), index, "black")).toThrow();
    expect(() => applyRetouches(base(), { [index]: "black" })).toThrow();
  });
  it("rejects unavailable colors", () => {
    expect(() => paintTile(emptyRetouches(), base(), 0, "blue")).toThrow();
    expect(() => applyRetouches(base(), { 0: "blue" })).toThrow();
  });
  it("bounds history without discarding earlier painted cells", () => {
    const design = base(); let edits = emptyRetouches();
    for (let i = 0; i < 130; i++) edits = paintTile(edits, design, i % 9, i % 2 ? "black" : "white");
    expect(edits.past.length).toBe(100); expect(Object.keys(edits.present)).toHaveLength(9);
    for (let i = 0; i < 100; i++) edits = undoRetouch(edits);
    expect(edits.future).toHaveLength(100); expect(undoRetouch(edits)).toBe(edits);
  });
});
