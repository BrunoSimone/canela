import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { inventoryFixture } from "../testing/memory-documents";
import { stockId } from "./sanity-inventory";
const items = [{ productId: "piece", quantity: 1 }];
const product = { id: "piece", name: "Pieza", tone: "stock" as const, price: 100 };
const edit = (extra = {}) => ({ mutationId: randomUUID(), expectedVersion: 0, expectedStock: 0, expectedReserved: 0, stockOnHand: 4, enabled: true, reason: "Carga inicial", ...extra });
describe("INV Sanity authoritative inventory", () => {
  it("reserves the last unit once under 10 simultaneous carts", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 1);
    const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => f.inventory.reserve(String(i), "cart", items)));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.stock("piece")).toMatchObject({ stockOnHand: 1, reserved: 1 });
  });
  it("never partially reserves a multi-product cart", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 4);
    await expect(f.inventory.reserve("order", "cart", [...items, { productId: "missing", quantity: 1 }])).rejects.toThrow();
    expect(await f.stock("piece")).toMatchObject({ reserved: 0 });
  });
  it("deduplicates concurrent reserve, consume and release; rejects terminal reversal", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 2);
    await Promise.all([f.inventory.reserve("o", "c", items), f.inventory.reserve("o", "c", items)]);
    await expect(f.inventory.reserve("o", "changed", items)).rejects.toThrow("RESERVATION_RETRY_CONFLICT");
    expect(await Promise.all([f.inventory.settle("o", "consumed"), f.inventory.settle("o", "consumed")])).toEqual([true, true]);
    expect(await f.inventory.settle("o", "released")).toBe(false);
    expect(await f.stock("piece")).toMatchObject({ stockOnHand: 1, reserved: 0 });
    await f.inventory.reserve("other", "c", items);
    await Promise.all([f.inventory.settle("other", "released"), f.inventory.settle("other", "released")]);
    expect(await f.stock("piece")).toMatchObject({ stockOnHand: 1, reserved: 0 });
  });
  it("a cleanup tombstone prevents delayed reservation", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 1);
    expect(await f.inventory.settle("missing", "consumed")).toBe(false);
    await f.inventory.settle("late", "released");
    await expect(f.inventory.reserve("late", "cart", items)).rejects.toThrow();
    expect(await f.stock("piece")).toMatchObject({ reserved: 0 });
  });
  it("recovers a response lost after Sanity committed without double decrement", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 1);
    await f.inventory.reserve("o", "c", items);
    const commit = f.documents.commit.bind(f.documents);
    vi.spyOn(f.documents, "commit").mockImplementationOnce(async m => { await commit(m); throw Error("TIMEOUT_AFTER_COMMIT"); });
    await expect(f.inventory.settle("o", "consumed")).rejects.toThrow("TIMEOUT");
    expect(await f.inventory.settle("o", "consumed")).toBe(true);
    expect(await f.stock("piece")).toMatchObject({ stockOnHand: 0, reserved: 0 });
  });
  it("audits manual updates, deduplicates retry and refuses stale counts after reservation", async () => {
    const f = inventoryFixture(); const input = edit();
    await Promise.all([f.inventory.save(product, input, "owner"), f.inventory.save(product, input, "owner")]);
    expect(await f.inventory.history("piece")).toHaveLength(1);
    await expect(f.inventory.save(product, { ...input, stockOnHand: 5 }, "owner")).rejects.toThrow("STOCK_RETRY_CONFLICT");
    await f.inventory.reserve("o", "c", items);
    await expect(f.inventory.save(product, edit({ expectedVersion: 1, expectedStock: 4 }), "owner")).rejects.toThrow("STOCK_CHANGED");
    await expect(f.inventory.save(product, edit({ expectedVersion: 2, expectedStock: 4, expectedReserved: 1, stockOnHand: 0 }), "owner")).rejects.toThrow("STOCK_BELOW_RESERVED");
  });
  it("rejects competing adjustments and enforces unique/made-to-order rules", async () => {
    const f = inventoryFixture();
    const results = await Promise.allSettled([f.inventory.save(product, edit(), "owner"), f.inventory.save(product, edit(), "owner")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await expect(f.inventory.save({ ...product, tone: "unica" }, edit(), "owner")).rejects.toThrow("UNIQUE_PIECE_LIMIT");
    await expect(f.inventory.save({ ...product, tone: "encargo" }, edit(), "owner")).rejects.toThrow("MADE_TO_ORDER_NOT_SELLABLE");
  });
  it("editorial publication cannot change operational stock; documents use private paths", async () => {
    const f = inventoryFixture(); f.documents.seed("piece", 1);
    await f.inventory.reserve("o", "c", items); await f.inventory.settle("o", "consumed");
    await f.documents.commit([{ create: { _id: "piece", _type: "producto", name: "Nueva foto/precio", price: 200 } }]);
    expect(await f.stock("piece")).toMatchObject({ stockOnHand: 0, reserved: 0 });
    expect(stockId("piece")).toContain(".");
    expect(await f.inventory.listAvailableProductIds()).toEqual(new Set());
  });
});
