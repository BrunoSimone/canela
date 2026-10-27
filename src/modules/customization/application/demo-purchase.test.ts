import { describe, expect, it } from "vitest";
import { DemoPurchaseService } from "./demo-purchase";
import { demoDesignCatalog } from "../infrastructure/demo-catalog";
import { demoPurchasePolicy, demoRecipient } from "../infrastructure/demo-purchase-config";
import { selectDesign, type DemoOutcome } from "../domain/purchase";

async function setup(capacity = 5) {
  let now = Date.parse("2026-10-26T12:00:00Z");
  const config = await demoDesignCatalog.configuration();
  const pricing = await demoDesignCatalog.pricing();
  const design = selectDesign((await demoDesignCatalog.templates())[0].design);
  const service = new DemoPurchaseService(config, pricing, { ...demoPurchasePolicy, capacity }, () => now);
  const input = () => ({ action: "quote", accepted: true, design: structuredClone(design), recipient: structuredClone(demoRecipient) });
  const quote = () => service.quote(input());
  const pay = (quoteId: string, outcome: DemoOutcome = "approved", attemptId = "attempt-one") => service.pay({ quoteId, outcome, attemptId });
  return { service, input, quote, pay, advance: (ms: number) => { now += ms; } };
}

describe("PER-132: isolated purchase simulation", () => {
  it("calculates authoritative design, frame, package and delivery snapshots", async () => {
    const s = await setup(); const input = s.input();
    const quote = s.service.quote({ ...input, totalCents: 1, shippingCents: 0, design: { ...input.design, config: { tileMm: 1 }, price: 1 } });
    expect(quote.frame.totalCents).toBe(9_600_000);
    expect(quote.shipping.cents).toBe(1_200_000);
    expect(quote.totalCents).toBe(10_800_000);
    expect(quote.design.config.tileMm).toBe(20);
    expect(quote.shipping.package).toEqual({ widthCm: 59, heightCm: 59, depthCm: 8, weightGrams: 6000 });
    expect(quote.mode).toBe("demo");
    expect(JSON.stringify(quote)).not.toMatch(/murvi|Vitro|DI99|sourceImageUrl/i);
    input.design.cells.fill("negro"); quote.design.cells.fill("negro");
    const order = s.pay(quote.id);
    expect(order.production).toBe("simulated");
    expect(s.service.snapshot(quote.id).design.cells).not.toEqual(quote.design.cells);
  });
  it.each(["configurationVersion", "cells", "size", "accepted", "recipient"])("rejects invalid %s", async field => {
    const s = await setup(); const input = s.input();
    if (field === "configurationVersion") input.design.configurationVersion = "old";
    if (field === "cells") input.design.cells[0] = "unknown";
    if (field === "size") input.design.size = 100;
    if (field === "accepted") Object.assign(input, { accepted: false });
    if (field === "recipient") input.recipient.delivery.postalCode = "0000";
    expect(() => s.service.quote(input)).toThrow();
  });
  it("PER-138: asks old palette sessions to reload and rejects private material IDs", async () => {
    const s = await setup(); const input = s.input();
    input.design.configurationVersion = "2026-10-27.murvi-1";
    expect(() => s.service.quote(input)).toThrow("recargá la página");
    const current = s.input(); current.design.cells[0] = "murvi-b-34";
    expect(() => s.service.quote(current)).toThrow("Revisá los datos");
  });
  it.each(["email", "phone", "recipientDocument"])("requires valid %s", async field => {
    const s = await setup(); const input = s.input();
    if (field === "email") input.recipient.email = "not-email";
    else Object.assign(input.recipient.delivery, { [field]: "" });
    expect(() => s.service.quote(input)).toThrow();
  });
  it("expires quotes before payment, and cannot resolve an expired pending payment", async () => {
    const s = await setup(); const q = s.quote(); const pending = s.pay(q.id, "pending");
    s.advance(demoPurchasePolicy.quoteTtlMs);
    expect(() => s.pay(q.id, "pending")).toThrow(/venció/);
    expect(() => s.service.resolve({ quoteId: q.id, orderId: pending.id, outcome: "approved" })).toThrow(/venció/);
    expect(() => s.pay(q.id, "approved", "another-attempt")).toThrow(/venció/);
  });
  it("replays a duplicate payment once and rejects a changed idempotent payload", async () => {
    const s = await setup(); const q = s.quote(); const first = s.pay(q.id);
    expect(s.pay(q.id)).toEqual(first);
    expect(s.pay(q.id, "approved", "different-key")).toEqual(first);
    expect(() => s.pay(q.id, "rejected")).toThrow(/intento/);
    expect(s.service.activeCount()).toBe(1);
  });
  it("pending never starts fabrication; resolves once and cannot reverse approval", async () => {
    const s = await setup(); const q = s.quote(); const order = s.pay(q.id, "pending");
    expect(order.production).toBe("not_started");
    const request = { quoteId: q.id, orderId: order.id, outcome: "approved" };
    const approved = s.service.resolve(request);
    expect(approved.id).toBe(order.id); expect(approved.production).toBe("simulated");
    expect(s.service.resolve(request)).toEqual(approved);
    expect(() => s.service.resolve({ ...request, outcome: "rejected" })).toThrow(/resuelto/);
  });
  it("rejects then retries with a new attempt without duplicate approval", async () => {
    const s = await setup(); const q = s.quote();
    expect(s.pay(q.id, "rejected").production).toBe("not_started");
    expect(s.service.activeCount()).toBe(0);
    const approved = s.pay(q.id, "approved", "second-attempt");
    expect(approved.status).toBe("approved"); expect(s.service.activeCount()).toBe(1);
    expect(s.pay(q.id, "rejected").status).toBe("rejected");
  });
  it("enforces capacity atomically and releases rejected pending reservations", async () => {
    const s = await setup(1); const a = s.quote(); const b = s.quote();
    const pending = s.pay(a.id, "pending");
    expect(() => s.pay(b.id)).toThrow(/capacidad/);
    s.service.resolve({ quoteId: a.id, orderId: pending.id, outcome: "rejected" });
    expect(s.pay(b.id).status).toBe("approved");
  });
  it("frees expired simulations on demand and bounds temporary storage", async () => {
    const s = await setup(1); const q = s.quote(); s.pay(q.id);
    s.advance(demoPurchasePolicy.retentionMs);
    expect(s.service.activeCount()).toBe(0);
    expect(() => s.service.snapshot(q.id)).toThrow(/venció/);
    for (let i = 0; i < demoPurchasePolicy.maxQuotes; i++) s.quote();
    expect(() => s.quote()).toThrow(/pruebas/);
  });
  it("rejects unknown order, outcome and oversized attempt identifiers", async () => {
    const s = await setup(); const q = s.quote();
    expect(() => s.service.pay({ quoteId: q.id, outcome: "paid", attemptId: "a" })).toThrow();
    expect(() => s.service.pay({ quoteId: q.id, outcome: "approved", attemptId: "x".repeat(200) })).toThrow();
    expect(() => s.service.resolve({ quoteId: q.id, orderId: "missing", outcome: "approved" })).toThrow();
  });
});
