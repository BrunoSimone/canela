// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { OrderDetailClient } from "./order-detail-client";
import { OrderOperations } from "./order-operations";
import { ShipmentActions } from "./shipment-actions";
import { demoOrderById } from "../infrastructure/demo-orders";
import type { AdminOrder } from "../domain/order";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const base: AdminOrder = { ...demoOrderById("11111111-1111-4111-8111-111111111111")!, source: "database", notificationsEnabled: true, shipmentEnabled: true };
const notice = (state: "review" | "pending") => ({ kind: "owner_paid" as const, state, attempts: 1, lastError: null });

describe("REV-03/04/05 priority without unsafe recovery", () => {
  it.each(["order", "notice"] as const)("puts %s review before products without running recovery on load", async (kind) => {
    const order: AdminOrder = kind === "order"
      ? { ...demoOrderById("22222222-2222-4222-8222-222222222222")!, source: "database" }
      : { ...base, notifications: [notice("review")] };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(order)));
    vi.stubGlobal("fetch", fetcher);
    render(<OrderDetailClient id={order.id} demo={false} backHref="/admin" />);
    const products = await screen.findByRole("heading", { name: "Productos" });
    const banner = screen.getAllByRole("note", { name: "Necesita revisión" })[0];
    expect(banner.compareDocumentPosition(products) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    if (kind === "notice") {
      const target = within(banner).getByRole("link", { name: "Revisar avisos" }).getAttribute("href")!;
      expect(document.querySelector(target)?.textContent).toContain("Despacho y avisos");
    }
  });

  it("requires human review of a failed notice while keeping the normal pending retry", () => {
    const { rerender } = render(<OrderOperations order={{ ...base, notifications: [notice("review")] }} onChanged={() => {}} />);
    expect(screen.getByRole("note", { name: "Necesita revisión" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /reintentar avisos/i })).toBeNull();
    rerender(<OrderOperations order={{ ...base, notifications: [notice("pending")] }} onChanged={() => {}} />);
    expect(screen.queryByRole("note", { name: "Necesita revisión" })).toBeNull();
    expect(screen.getByRole("button", { name: /reintentar avisos/i })).toBeTruthy();
  });

  it("keeps shipment review blocked and allows a safe lookup of an uncertain result", () => {
    const shipment = { state: "review" as const, lastError: null, remoteId: null, trackingUrl: null, trackingNumber: null, sandbox: true };
    const { rerender } = render(<ShipmentActions order={{ ...base, shipment }} onChanged={() => {}} />);
    expect(screen.getByRole("note", { name: "Necesita revisión" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<ShipmentActions order={{ ...base, shipment: { ...shipment, state: "uncertain" } }} onChanged={() => {}} />);
    expect(screen.getByRole("button", { name: "Consultar envío y etiqueta" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Generar etiqueta/ })).toBeNull();
  });

  it("does not present ordinary payment waiting as a priority incident", async () => {
    const order = demoOrderById("44444444-4444-4444-8444-444444444444")!;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(order))));
    render(<OrderDetailClient id={order.id} demo backHref="/admin?demo=1" />);
    await screen.findByRole("heading", { name: "Productos" });
    expect(screen.queryByRole("note", { name: "Necesita revisión" })).toBeNull();
    expect(screen.getByText("Esperar la confirmación del pago.")).toBeTruthy();
  });
});
