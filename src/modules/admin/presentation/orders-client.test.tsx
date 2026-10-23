// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrdersClient } from "./orders-client";
import { demoOrderById } from "../infrastructure/demo-orders";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const order = demoOrderById("11111111-1111-4111-8111-111111111111")!;
describe("UX-04 order recovery and navigation", () => {
  it("retries a failed list request without losing the search", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, {status:503}))
      .mockResolvedValue(new Response(JSON.stringify({orders:[order],nextCursor:null})));
    vi.stubGlobal("fetch", fetcher);
    render(<OrdersClient demo={false} initialQuery="pieza" initialSort="created_desc" />);
    await userEvent.click(await screen.findByRole("button", {name:"Reintentar"}));
    await screen.findByRole("link", {name:"Ver pedido"});
    expect(String(fetcher.mock.calls.at(-1)?.[0])).toContain("q=pieza");
  });
  it("offers sign-in when the session expires instead of a generic failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status:401})));
    render(<OrdersClient demo={false} initialQuery="" initialSort="created_desc" />);
    expect((await screen.findByRole("link", {name:"Volver a ingresar"})).getAttribute("href")).toBe("/admin/ingresar");
  });
  it("offers a direct detail link for every row, independent of the preview position", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({orders:[order],nextCursor:null}))));
    render(<OrdersClient demo initialQuery="" initialSort="created_desc" />);
    const link = await screen.findByRole("link", {name:`Abrir pedido ${order.reference}`});
    expect(link.getAttribute("href")).toContain(`/admin/pedidos/${order.id}?demo=1`);
    expect(link.closest("button")).toBeNull();
  });
});
