import { describe, expect, it, vi } from "vitest";
import { inventoryHandlers } from "./inventory-handler";
import { parseStockEdit } from "../domain/stock-edit";
const req = (origin = "http://localhost:3000", body = "{}") => new Request("http://localhost:3000/api/admin/inventory", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body });
describe("inventory HTTP boundaries", () => {
  it("rejects unauthenticated reads and writes before touching the database", async () => {
    const repository = vi.fn(), h = inventoryHandlers({ session: async () => null, catalog: vi.fn(), repository });
    expect((await h.get(req())).status).toBe(401); expect((await h.post(req())).status).toBe(401); expect(repository).not.toHaveBeenCalled();
  });
  it("rejects cross-origin, oversized and malformed bodies", async () => {
    const repository = vi.fn(), h = inventoryHandlers({ session: async () => ({ email: "owner" }), catalog: vi.fn(), repository });
    expect((await h.post(req("https://evil.test"))).status).toBe(403);
    expect((await h.post(req(undefined, "x".repeat(5000)))).status).toBe(422);
    expect((await h.post(req(undefined, "{}"))).status).toBe(422); expect(repository).not.toHaveBeenCalled();
  });
  it("requires integers, reason, idempotency and expected stock snapshot", () => {
    expect(() => parseStockEdit(null)).toThrow();
    expect(() => parseStockEdit({ stockOnHand: -1 })).toThrow();
  });
});
