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

const mocks = vi.hoisted(() => ({ load: vi.fn(), guide: vi.fn() }));
vi.mock("./local-image", () => ({ loadLocalImage: mocks.load }));
vi.mock("./open-guide", () => ({ openGuide: mocks.guide }));
vi.mock("react-easy-crop", () => ({ default: () => <div>Recortador de imagen</div> }));
const template = (): DesignTemplate => ({ id: "test", title: "Flor de prueba", description: "Ejemplo", published: true, demonstration: true, design: renderMosaic(raster(), testWorkshop, 3) });
const setup = (selected = true) => render(<Creator config={testWorkshop} template={selected ? template() : null} example={template()} templateUnavailable={false} />);
beforeEach(() => { vi.stubGlobal("URL", { revokeObjectURL: vi.fn() }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("PER-130: creator user journeys", () => {
  it("starts empty, offers a gallery example, and never offers checkout", async () => {
    setup(false);
    expect((screen.getByRole("button", { name: "Ver guía de prueba" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Probar con un ejemplo" }));
    expect(screen.getByRole("img", { name: /Tu mosaico de 3 por 3/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /comprar|pagar/i })).toBeNull();
  });
  it("gallery template → change size/color → exact guide → reset", async () => {
    setup();
    fireEvent.change(screen.getByRole("slider", { name: "Cantidad de venecitas por lado" }), { target: { value: "5" } });
    await userEvent.click(screen.getByText("Personalizar colores"));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Reemplazar Rojo" }), "black");
    await userEvent.click(screen.getByRole("button", { name: "Ver guía de prueba" }));
    expect(mocks.guide.mock.calls[0][0].cells).toEqual(Array(25).fill("black"));
    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    expect(screen.queryByRole("img", { name: /Tu mosaico/ })).toBeNull();
    expect((screen.getByRole("button", { name: "Ver guía de prueba" }) as HTMLButtonElement).disabled).toBe(true);
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
    await userEvent.click(screen.getByRole("button", { name: "Ver guía de prueba" }));
    expect(mocks.guide.mock.calls[0][0].cells.every((c: string) => c === "black")).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
  });
  it("explains an unavailable template while keeping upload accessible", () => {
    render(<Creator config={testWorkshop} template={null} example={null} templateUnavailable />);
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
});
