// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { cartReducer, addItem } from "@/modules/cart/presentation/state/cart-slice";
import { Creator } from "./creator";
import { DemoPurchaseService } from "../application/demo-purchase";
import { createDemoPurchaseHandler } from "./demo-purchase-http";
import { demoDesignCatalog } from "../infrastructure/demo-catalog";
import { demoPurchasePolicy, demoRecipient } from "../infrastructure/demo-purchase-config";
import { installEditorDom } from "../testing/editor-dom";

vi.mock("react-easy-crop", () => ({ default: () => <div /> }));
let now: number;
let service: DemoPurchaseService;
let requests: Mock<(url: string, init?: RequestInit) => Promise<Response>>;
let handler: ReturnType<typeof createDemoPurchaseHandler>;
let cart: ReturnType<typeof configureCart>;
const configureCart = () => configureStore({ reducer: { cart: cartReducer } });
beforeEach(async () => {
  now = Date.parse("2026-10-26T12:00:00Z");
  const config = await demoDesignCatalog.configuration(); const pricing = await demoDesignCatalog.pricing();
  service = new DemoPurchaseService(config, pricing, demoPurchasePolicy, () => now);
  handler = createDemoPurchaseHandler({ enabled: () => true, service: async () => service, recipient: demoRecipient });
  requests = vi.fn(async (url: string, init?: RequestInit) => {
    expect(url).toBe("/api/cuadros/prueba");
    return handler(new Request(`http://localhost:3000${url}`, { ...init, headers: { ...init?.headers, origin: "http://localhost:3000" } }));
  });
  vi.stubGlobal("fetch", requests);
  cart = configureCart(); cart.dispatch(addItem({ id: "real-stock-item", name: "Florero", price: 1000, checkoutEligible: true }));
  render(<Provider store={cart}><Creator config={config} pricing={pricing} template={(await demoDesignCatalog.templates())[0]} templateUnavailable={false} purchaseDemoEnabled /></Provider>);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function review() { await userEvent.click(screen.getByRole("button", { name: "Revisar mi cuadro" })); }
async function shipping() {
  await review();
  expect((screen.getByRole("button", { name: "Continuar con el envío" }) as HTMLButtonElement).disabled).toBe(true);
  await userEvent.click(screen.getByRole("checkbox", { name: /Revisé el diseño/ }));
  await userEvent.click(screen.getByRole("button", { name: "Continuar con el envío" }));
}
async function payment() {
  await shipping();
  await userEvent.click(screen.getByRole("button", { name: "Completar con datos ficticios" }));
  await waitFor(() => expect((screen.getByLabelText("Nombre y apellido") as HTMLInputElement).value).toBe("Persona de prueba"));
  await userEvent.click(screen.getByRole("button", { name: "Cotizar envío de prueba" }));
  expect(await screen.findByRole("heading", { name: "Probá el pago de tu cuadro" })).toBeTruthy();
}
describe("PER-132: separate purchase journeys", () => {
  it("PER-133: a retouched grid survives review, backend validation, approval and return to editing", async () => {
    installEditorDom(); const before = structuredClone(cart.getState());
    const original = (await demoDesignCatalog.templates())[0].design;
    const config = await demoDesignCatalog.configuration(); const color = config.palette.find(c => c.id !== original.cells[0])!;
    const price = screen.getByLabelText("Precio estimado del cuadro").textContent;
    await userEvent.click(screen.getByRole("button", { name: "Retocar venecitas" }));
    fireEvent.keyDown(screen.getByRole("group", { name: "Mosaico editable" }), { key: "Home" });
    await userEvent.click(screen.getByRole("button", { name: `Usar color ${color.name}` }));
    await userEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.getByLabelText("Precio estimado del cuadro").textContent).toBe(price);
    expect(requests).not.toHaveBeenCalled();
    await payment(); await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Prueba completada" })).toBeTruthy();
    const pay = requests.mock.calls.map(([, init]) => init?.body ? JSON.parse(String(init.body)) : {}).find(body => body.action === "pay");
    const snapshot = service.snapshot(pay.quoteId);
    expect(snapshot.design.cells).toEqual([color.id, ...original.cells.slice(1)]);
    expect(cart.getState()).toEqual(before);
    await userEvent.click(screen.getByRole("button", { name: "Volver a mi diseño" }));
    expect(screen.getByRole("img", { name: /Tu mosaico/ }).querySelector("[data-cell]")?.getAttribute("fill")).toBe(color.hex);
    await userEvent.click(screen.getByRole("button", { name: "Retocar venecitas" }));
    expect((screen.getByRole("button", { name: "Deshacer retoque" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("review → address → quote → approved; preserves the stock cart and excludes original images", async () => {
    const before = structuredClone(cart.getState());
    await payment();
    expect(screen.getByLabelText("Total de prueba").textContent).toContain("108.000");
    expect(screen.queryByLabelText(/tarjeta|CVV/i)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Prueba completada" })).toBeTruthy();
    expect(service.activeCount()).toBe(1); expect(cart.getState()).toEqual(before);
    for (const [, init] of requests.mock.calls) if (init?.body) {
      const body = JSON.parse(String(init.body));
      expect(body).not.toHaveProperty("image"); expect(body).not.toHaveProperty("photo"); expect(body).not.toHaveProperty("totalCents");
      if (body.design) expect(Object.keys(body.design).sort()).toEqual(["algorithm", "cells", "configurationId", "configurationVersion", "size", "version"]);
    }
    await userEvent.click(screen.getByRole("button", { name: "Volver a mi diseño" }));
    expect(screen.getByRole("img", { name: /Tu mosaico de 25 por 25/ })).toBeTruthy();
  });
  it.each(["Simular confirmación", "Simular rechazo"])("pending → %s", async action => {
    await payment(); await userEvent.click(screen.getByRole("radio", { name: /Pendiente/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Pago de prueba pendiente" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver a mi diseño" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: action }));
    expect(await screen.findByRole("heading", { name: action === "Simular confirmación" ? "Prueba completada" : "Pago de prueba rechazado" })).toBeTruthy();
  });
  it("rejected → retry approved with a fresh attempt", async () => {
    await payment(); await userEvent.click(screen.getByRole("radio", { name: /Rechazado/ }));
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Pago de prueba rechazado" })).toBeTruthy();
    expect(service.activeCount()).toBe(0);
    await userEvent.click(screen.getByRole("button", { name: "Volver a intentar" }));
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Prueba completada" })).toBeTruthy();
    expect(service.activeCount()).toBe(1);
  });
  it("expired quote returns to delivery with design and address intact", async () => {
    await payment(); now += demoPurchasePolicy.quoteTtlMs;
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "¿A dónde iría tu cuadro?" })).toBeTruthy();
    expect((screen.getByLabelText("Nombre y apellido") as HTMLInputElement).value).toBe("Persona de prueba");
    expect(screen.queryByLabelText("Total de prueba")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Cotizar envío de prueba" }));
    expect(await screen.findByLabelText("Total de prueba")).toBeTruthy();
  });
  it("editing delivery discards the quote and recalculates the next destination", async () => {
    await payment(); await userEvent.click(screen.getByRole("button", { name: "Editar domicilio" }));
    expect(screen.queryByLabelText("Total de prueba")).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText("Provincia"), "C");
    await userEvent.click(screen.getByRole("button", { name: "Cotizar envío de prueba" }));
    expect((await screen.findByLabelText("Total de prueba")).textContent).toContain("109.500");
  });
  it("invalid delivery stays editable without calling the backend", async () => {
    await shipping(); await userEvent.click(screen.getByRole("button", { name: "Completar con datos ficticios" }));
    await waitFor(() => expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).not.toBe(""));
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "invalid" } });
    await userEvent.click(screen.getByRole("button", { name: "Cotizar envío de prueba" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(requests).toHaveBeenCalledTimes(1);
  });
  it("lost payment response retries the same attempt and creates only one simulated order", async () => {
    await payment(); const normal = requests.getMockImplementation()!;
    requests.mockImplementationOnce(async (...args) => { await normal(...args); throw new Error("connection lost after commit"); });
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("alert")).toBeTruthy(); expect(service.activeCount()).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Simular pago" }));
    expect(await screen.findByRole("heading", { name: "Prueba completada" })).toBeTruthy();
    const payments = requests.mock.calls.map(([, init]) => init?.body ? JSON.parse(String(init.body)) : {}).filter(b => b.action === "pay");
    expect(payments).toHaveLength(2); expect(payments[0].attemptId).toBe(payments[1].attemptId); expect(service.activeCount()).toBe(1);
  });
  it("blocks double clicks while a payment is running", async () => {
    await payment(); let finish!: () => void;
    const normal = requests.getMockImplementation()!;
    requests.mockImplementationOnce(async (...args) => { await new Promise<void>(resolve => { finish = resolve; }); return normal(...args); });
    const button = screen.getByRole("button", { name: "Simular pago" });
    fireEvent.click(button); fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish());
    expect(await screen.findByRole("heading", { name: "Prueba completada" })).toBeTruthy(); expect(service.activeCount()).toBe(1);
  });
});
