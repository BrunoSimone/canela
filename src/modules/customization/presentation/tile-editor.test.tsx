// @vitest-environment jsdom
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TileEditor } from "./tile-editor";
import { applyRetouches, emptyRetouches, paintTile, restoreTile, undoRetouch, redoRetouch } from "../domain/retouches";
import { renderMosaic } from "../domain/design";
import { raster, testWorkshop } from "../testing/workshop";
import { installEditorDom } from "../testing/editor-dom";

const base = renderMosaic(raster(), testWorkshop, 3);
function Harness() {
  const [history, setHistory] = useState(emptyRetouches), [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return <><button ref={button} onClick={() => setOpen(true)}>Retocar</button>{open && <TileEditor design={applyRetouches(base, history.present)} history={history} returnFocus={button} onClose={() => setOpen(false)} onPaint={(i, c) => setHistory(h => paintTile(h, base, i, c))} onRestore={i => setHistory(h => restoreTile(h, base, i))} onUndo={() => setHistory(undoRetouch)} onRedo={() => setHistory(redoRetouch)} />}</>;
}
const cells = () => [...screen.getByRole("img", { name: "Cuadro en edición" }).querySelectorAll("rect")].slice(2).map(r => r.getAttribute("fill"));
beforeEach(installEditorDom);
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function open() { render(<Harness />); await userEvent.click(screen.getByRole("button", { name: "Retocar" })); return screen.findByRole("group", { name: "Mosaico editable" }); }
describe("PER-133: editor interaction", () => {
  it("keyboard selects one piece, paints, undoes/redoes/restores, keeps edits and returns focus", async () => {
    const stage = await open();
    expect((screen.getByRole("button", { name: "Usar color Blanco" }) as HTMLButtonElement).disabled).toBe(true);
    stage.focus(); fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Fila 1 · Columna 1");
    fireEvent.keyDown(stage, { key: "Enter" }); expect(document.activeElement?.getAttribute("aria-label")).toBe("Usar color Rojo");
    await userEvent.click(screen.getByRole("button", { name: "Usar color Blanco" }));
    expect(cells()).toEqual(["#ffffff", ...Array(8).fill("#ff0000")]);
    fireEvent.keyDown(stage, { key: "z", ctrlKey: true }); expect(cells()).toEqual(Array(9).fill("#ff0000"));
    fireEvent.keyDown(stage, { key: "Z", metaKey: true, shiftKey: true }); expect(cells()[0]).toBe("#ffffff");
    await userEvent.click(screen.getByRole("button", { name: "Restaurar color de esta venecita" })); expect(cells()[0]).toBe("#ff0000");
    await userEvent.click(screen.getByRole("button", { name: "Deshacer retoque" }));
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Retocar"));
    await userEvent.click(screen.getByRole("button", { name: "Retocar" })); expect(cells()[0]).toBe("#ffffff");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("pointer selects under zoom; pan, pinch and cancellation never paint or select", async () => {
    const stage = await open();
    const down = (id: number, x: number, y: number) => fireEvent.pointerDown(stage, { pointerId: id, clientX: x, clientY: y, button: 0 });
    const move = (id: number, x: number, y: number) => fireEvent.pointerMove(stage, { pointerId: id, clientX: x, clientY: y });
    const up = (id: number, x: number, y: number) => fireEvent.pointerUp(stage, { pointerId: id, clientX: x, clientY: y });
    down(1, 2, 2); up(1, 2, 2); expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Elegí");
    down(1, 200, 200); move(1, 240, 200); up(1, 240, 200); expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Elegí");
    down(1, 120, 200); down(2, 280, 200); move(1, 80, 200); move(2, 320, 200); up(2, 320, 200); up(1, 80, 200);
    expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Elegí");
    down(1, 200, 200); fireEvent.pointerCancel(stage, { pointerId: 1, clientX: 200, clientY: 200 }); up(1, 200, 200);
    expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Elegí");
    await userEvent.click(screen.getByRole("button", { name: "Ver cuadro completo" }));
    await userEvent.click(screen.getByRole("button", { name: "Acercar mosaico" }));
    down(1, 200, 200); up(1, 200, 200); expect(screen.getByRole("status", { name: "Venecita seleccionada" }).textContent).toContain("Fila 2 · Columna 2");
    await userEvent.click(screen.getByRole("button", { name: "Usar color Negro" }));
    expect(cells()).toEqual(base.cells.map((_, i) => i === 4 ? "#000000" : "#ff0000"));
    await userEvent.click(screen.getByRole("button", { name: "Ver cuadro completo" })); expect(screen.getByLabelText("Zoom del mosaico").textContent).toBe("100%");
    expect(cells()[4]).toBe("#000000");
  });
});
