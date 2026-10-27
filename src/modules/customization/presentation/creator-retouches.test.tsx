// @vitest-environment jsdom
import { publishPricing } from "../domain/public-pricing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Creator } from "./creator";
import { renderMosaic, type Crop } from "../domain/design";
import { raster, testWorkshop } from "../testing/workshop";
import { testPricing } from "../testing/pricing";
import { installEditorDom } from "../testing/editor-dom";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./local-image", () => ({ loadLocalImage: mocks.load }));
vi.mock("react-easy-crop", () => ({ default: ({ onCropComplete }: { onCropComplete: (a: Crop, b: Crop) => void }) => <button onClick={() => { const area = { x: 1, y: 1, width: 2, height: 2 }; onCropComplete(area, area); }}>Mover recorte</button> }));
beforeEach(() => { installEditorDom(); vi.stubGlobal("URL", { revokeObjectURL: vi.fn() }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); });
const setup = () => render(<Creator config={testWorkshop} pricing={publishPricing(testWorkshop, testPricing)} template={{ id: "test", title: "Flor", description: "", published: true, demonstration: true, design: renderMosaic(raster(), testWorkshop, 3) }} templateUnavailable={false} />);
const cells = () => [...screen.getByRole("img", { name: /Tu mosaico/ }).querySelectorAll("[data-cell]")].map(r => r.getAttribute("fill"));
async function retouch() {
  await userEvent.click(screen.getByRole("button", { name: "Retocar venecitas" }));
  fireEvent.keyDown(screen.getByRole("group", { name: "Mosaico editable" }), { key: "Home" });
  await userEvent.click(screen.getByRole("button", { name: "Usar color Blanco" }));
  await userEvent.click(screen.getByRole("button", { name: "Listo" }));
}
const file = () => new File(["x"], "foto.png", { type: "image/png" });
describe("PER-133: preserve corrections through regeneration and review", () => {
  it("preserves a correction through global color changes and review without changing price or contacting services", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch); setup(); const price = screen.getByLabelText("Precio estimado del cuadro").textContent;
    await retouch(); await userEvent.click(screen.getByText("Personalizar colores"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reemplazar Rojo" }), "black");
    expect(cells()).toEqual(["#ffffff", ...Array(8).fill("#000000")]);
    expect(screen.getByLabelText("Precio estimado del cuadro").textContent).toBe(price);
    await userEvent.click(screen.getByRole("button", { name: "Revisar mi cuadro" }));
    expect(screen.getByRole("img").querySelector("[data-cell]")?.getAttribute("fill")).toBe("#ffffff");
    expect(screen.getByRole("img").querySelector("[data-material-surface]")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" })); expect(cells()[0]).toBe("#ffffff");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("cancels and confirms a resize; cancel retains dimensions and edits", async () => {
    setup(); await retouch(); const slider = screen.getByRole("slider", { name: "Cantidad de venecitas por lado" });
    fireEvent.change(slider, { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: "Conservar retoques" })); expect(cells()).toHaveLength(9); expect(cells()[0]).toBe("#ffffff");
    fireEvent.change(slider, { target: { value: "5" } });
    await userEvent.click(screen.getByRole("button", { name: "Continuar sin los retoques" })); expect(cells()).toEqual(Array(25).fill("#ff0000"));
  });
  it("requires confirmation to reset and clears all state only when accepted", async () => {
    setup(); await retouch(); await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await userEvent.click(screen.getByRole("button", { name: "Conservar retoques" })); expect(cells()[0]).toBe("#ffffff");
    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" })); await userEvent.click(screen.getByRole("button", { name: "Continuar sin los retoques" }));
    expect(screen.queryByRole("button", { name: "Retocar venecitas" })).toBeNull(); expect(screen.queryByLabelText("Precio estimado del cuadro")).toBeNull();
  });
  it("canceling photo replacement avoids decoding; invalid replacement retains corrections; valid replacement clears them", async () => {
    setup(); await retouch(); await userEvent.upload(screen.getByLabelText("Elegir imagen"), file());
    await userEvent.click(screen.getByRole("button", { name: "Conservar retoques" })); expect(mocks.load).not.toHaveBeenCalled();
    mocks.load.mockRejectedValueOnce(new Error("Foto inválida"));
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), file()); await userEvent.click(screen.getByRole("button", { name: "Continuar sin los retoques" }));
    expect(await screen.findByRole("alert")).toBeTruthy(); expect(cells()[0]).toBe("#ffffff");
    mocks.load.mockResolvedValueOnce({ url: "blob:new", raster: raster(4, 4, [0, 0, 0, 255]) });
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), file()); await userEvent.click(screen.getByRole("button", { name: "Continuar sin los retoques" }));
    await waitFor(() => expect(cells()).toEqual(Array(9).fill("#000000")));
  });
  it("locks cropping while corrections exist and requires confirmation to unlock", async () => {
    setup(); mocks.load.mockResolvedValueOnce({ url: "blob:photo", raster: raster() });
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), file()); await retouch();
    expect(screen.getByLabelText("Recortar imagen").hasAttribute("inert")).toBe(true);
    fireEvent.click(screen.getByText("Mover recorte")); expect(cells()[0]).toBe("#ffffff");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar encuadre" })); await userEvent.click(screen.getByRole("button", { name: "Conservar retoques" })); expect(cells()[0]).toBe("#ffffff");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar encuadre" })); await userEvent.click(screen.getByRole("button", { name: "Continuar sin los retoques" }));
    expect(screen.getByLabelText("Recortar imagen").hasAttribute("inert")).toBe(false); expect(cells()).toEqual(Array(9).fill("#ff0000"));
  });
});
