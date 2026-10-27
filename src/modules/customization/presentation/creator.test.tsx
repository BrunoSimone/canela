// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Creator } from "./creator";
import { Gallery } from "./gallery";
import { renderMosaic } from "../domain/design";
import { raster, testWorkshop } from "../testing/workshop";
import type { DesignTemplate } from "../application/catalog";
import type { LocalImage } from "./local-image";
import { testPricing } from "../testing/pricing";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("./local-image", () => ({ loadLocalImage: mocks.load }));
vi.mock("react-easy-crop", () => ({ default: ({ onCropChange }: { onCropChange: (crop: { x: number; y: number }) => void }) => <div>Recortador de imagen<button onClick={() => onCropChange({ x: 10, y: 0 })}>Mover recorte de prueba</button></div> }));
const template = (): DesignTemplate => ({ id: "test", title: "Flor de prueba", description: "Ejemplo", published: true, demonstration: true, design: renderMosaic(raster(), testWorkshop, 3) });
const setup = (selected = true) => render(<Creator config={testWorkshop} pricing={testPricing} template={selected ? template() : null} templateUnavailable={false} />);
const visibleCells = () => [...screen.getByRole("img", { name: /Tu mosaico/ }).querySelectorAll("[data-cell]")].map(cell => cell.getAttribute("fill"));
beforeEach(() => { vi.stubGlobal("URL", { revokeObjectURL: vi.fn() }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("PER-130: creator user journeys", () => {
  it("PER-137: photo zoom, size and crop adjustments show the live mosaic after comparing the original", async () => {
    mocks.load.mockResolvedValue({ url: "blob:photo", raster: raster() }); setup(false);
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: "Recorte" }));
    expect(screen.getByRole("img", { name: "Recorte de tu imagen" })).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: /Acercar imagen/ }), { target: { value: "1.5" } });
    expect(screen.getByRole("img", { name: /Tu mosaico/ })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Recorte" }));
    fireEvent.change(screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }), { target: { value: "5" } });
    expect(visibleCells()).toHaveLength(25);
    await userEvent.click(screen.getByRole("button", { name: "Recorte" }));
    await userEvent.click(screen.getByRole("button", { name: "Mover recorte de prueba" }));
    expect(screen.getByRole("img", { name: /Tu mosaico/ })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Recorte de tu imagen" })).toBeNull();
  });
  it("PER-132: starts empty without examples, price or dimensions; enables after a valid photo", async () => {
    setup(false);
    expect((screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Probar con un ejemplo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar mi cuadro" })).toBeNull();
    expect(screen.queryByLabelText("Precio estimado del cuadro")).toBeNull();
    expect(screen.queryByText(/con marco|venecitas enteras/)).toBeNull();
    mocks.load.mockRejectedValueOnce(new Error("Imagen inválida"));
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByLabelText("Precio estimado del cuadro")).toBeNull();
    mocks.load.mockResolvedValueOnce({ url: "blob:valid", raster: raster() });
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    expect(await screen.findByRole("img", { name: /Tu mosaico/ })).toBeTruthy();
    expect((screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }) as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByLabelText("Precio estimado del cuadro")).toBeTruthy();
  });
  it("gallery template → change size/color → preview → reset", async () => {
    setup();
    fireEvent.change(screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }), { target: { value: "5" } });
    await userEvent.click(screen.getByText("Personalizar colores"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reemplazar Rojo" }), "black");
    expect(visibleCells()).toEqual(Array(25).fill("#000000"));
    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    expect(screen.queryByRole("img", { name: /Tu mosaico/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar mi cuadro" })).toBeNull();
  });
  it("keeps a previous design when loading fails", async () => {
    mocks.load.mockRejectedValue(new Error("Ese formato no es compatible."));
    setup();
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("img", { name: /Tu mosaico de 3 por 3/ })).toBeTruthy();
  });
  it("releases photo URLs and does not restore a draft on remount", async () => {
    mocks.load.mockResolvedValue({ url: "blob:photo", raster: raster() });
    const view = setup(false);
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    expect(await screen.findByRole("img", { name: /Tu mosaico/ })).toBeTruthy();
    view.unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo");
    setup(false);
    expect(screen.queryByRole("img", { name: /Tu mosaico/ })).toBeNull();
  });
  it("ignores and releases a late upload after reset", async () => {
    let finish!: (v: LocalImage) => void;
    mocks.load.mockReturnValue(new Promise<LocalImage>(resolve => { finish = resolve; }));
    setup();
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), new File(["x"], "foto.png", { type: "image/png" }));
    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await act(async () => finish({ url: "blob:late", raster: raster() }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:late");
    expect(screen.queryByRole("img", { name: /Tu mosaico/ })).toBeNull();
  });
  it("accepts a dropped image without any upload request", async () => {
    mocks.load.mockResolvedValue({ url: "blob:drop", raster: raster() });
    setup(false);
    fireEvent.drop(screen.getByTestId("image-dropzone"), { dataTransfer: { files: [new File(["x"], "foto.png", { type: "image/png" })] } });
    await waitFor(() => expect(mocks.load).toHaveBeenCalledOnce());
    expect(await screen.findByRole("img", { name: /Tu mosaico/ })).toBeTruthy();
  });
  it("keeps the latest photo when a previous decoding finishes later", async () => {
    let first!: (v: LocalImage) => void;
    mocks.load.mockImplementationOnce(() => new Promise<LocalImage>(resolve => { first = resolve; }))
      .mockResolvedValueOnce({ url: "blob:second", raster: raster(4, 4, [0, 0, 0, 255]) });
    setup(false);
    const file = new File(["x"], "foto.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), file);
    await userEvent.upload(screen.getByLabelText("Elegir imagen"), file);
    await act(async () => first({ url: "blob:first", raster: raster() }));
    expect(visibleCells().every(c => c === "#000000")).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
  });
  it("explains an unavailable template while keeping upload accessible", () => {
    render(<Creator config={testWorkshop} pricing={testPricing} template={null} templateUnavailable />);
    expect(screen.getByRole("alert").textContent).toContain("no está disponible");
    expect(screen.getByLabelText("Elegir imagen")).toBeTruthy();
  });
  it("links gallery templates to their creator and labels demonstration content", () => {
    render(<Gallery templates={[template()]} />);
    expect(screen.getByRole("link", { name: "Crear uno similar" }).getAttribute("href")).toBe("/crear-cuadro?diseno=test");
    expect(screen.getByText("Diseño de ejemplo")).toBeTruthy();
  });
  it("offers a useful empty gallery", () => {
    render(<Gallery templates={[]} />);
    expect(screen.getByRole("link", { name: "Crear mi cuadro" }).getAttribute("href")).toBe("/crear-cuadro");
  });
  it("PER-131: never exposes manufacturing exports or counts by color", () => {
    setup();
    expect(screen.queryByRole("button", { name: /guía|imprimir|descargar/i })).toBeNull();
    expect(screen.queryByLabelText("Piezas por color")).toBeNull();
    expect(screen.getByLabelText("Colores del cuadro").textContent).toBe("Rojo");
  });
  it("PER-131: updates price with size, preserves it on recolor and reviews without creating an order", async () => {
    setup();
    const initial = screen.getByLabelText("Precio estimado del cuadro").textContent;
    fireEvent.change(screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }), { target: { value: "30" } });
    const updated = screen.getByLabelText("Precio estimado del cuadro").textContent;
    expect(updated).not.toBe(initial);
    expect(updated).toContain("132.000");
    await userEvent.click(screen.getByText("Personalizar colores"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reemplazar Rojo" }), "black");
    expect(screen.getByLabelText("Precio estimado del cuadro").textContent).toBe(updated);
    await userEvent.click(screen.getByRole("button", { name: "Revisar mi cuadro" }));
    expect(screen.getByRole("heading", { name: "Revisá tu cuadro" })).toBeTruthy();
    expect(screen.getByText(/No se creó un pedido/)).toBeTruthy();
    expect(screen.getByText("Envío a cotizar")).toBeTruthy();
    expect(screen.getByLabelText("Precio estimado del cuadro").textContent).toBe(updated);
    expect(screen.getByText("Precio del cuadro con marco · ARS · De prueba")).toBeTruthy();
    expect(screen.queryByText(/Venecitas estimadas|Mano de obra|insumos estimados|Redondeo de la estimación/)).toBeNull();
    expect(screen.queryByRole("button", { name: /pagar|comprar|agregar al carrito/i })).toBeNull();
    expect(visibleCells()).toEqual(Array(900).fill("#000000"));
    await userEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(visibleCells()).toEqual(Array(900).fill("#000000"));
    expect(screen.getByLabelText("Precio estimado del cuadro").textContent).toBe(updated);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Revisar mi cuadro" }));
  });
});
