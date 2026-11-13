import { describe, it, expect, vi } from "vitest";
import { catalogHandlers } from "./catalog-http";
import { CatalogError } from "../domain/editor";
function setup() {
  const repo = {
    create: vi.fn().mockResolvedValue({ id: "a" }),
    get: vi.fn().mockResolvedValue({ id: "a", kind: "product", version: 1 }),
    change: vi.fn().mockResolvedValue({ id: "a" }),
  };
  const prepare = vi.fn();
  const session = vi.fn().mockResolvedValue({ email: "owner@example.com" });
  const handlers = catalogHandlers({
    session,
    enabled: () => true,
    repository: () => repo as never,
    media: () => ({}) as never,
    inventory: () => ({}) as never,
    prepare,
    origin: (r) => r.headers.get("origin") === "https://canela.test",
  });
  return { repo, prepare, session, ...handlers };
}
const request = (body: unknown, origin = "https://canela.test") =>
  new Request("https://canela.test/api/admin/catalog", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
describe("CAT-154 admin API boundaries", () => {
  it("requires an authenticated allowed administrator before accessing a document", async () => {
    const h = setup();
    h.session.mockResolvedValue(null);
    expect(
      (await h.get(new Request("https://canela.test/api/admin/catalog?id=a")))
        .status,
    ).toBe(401);
    expect(
      (
        await h.post(
          request({ action: "create", kind: "product", document: {} }),
        )
      ).status,
    ).toBe(401);
    expect(h.repo.create).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes and demo writes", async () => {
    const h = setup();
    expect((await h.post(request({}, "https://evil.test"))).status).toBe(403);
    expect(
      (
        await h.post(
          new Request("https://canela.test/api/admin/catalog?demo=1", {
            method: "POST",
            headers: { origin: "https://canela.test" },
          }),
        )
      ).status,
    ).toBe(403);
    expect(h.prepare).not.toHaveBeenCalled();
  });
  it("strips injected stock, arbitrary image URLs and private fields before saving", async () => {
    const h = setup();
    const r = await h.post(
      request({
        action: "create",
        kind: "product",
        document: {
          name: "Pieza",
          stockOnHand: 999,
          url: "https://evil.test",
          buyerEmail: "private",
        },
      }),
    );
    expect(r.status).toBe(201);
    expect(h.repo.create).toHaveBeenCalledWith(
      "product",
      { name: "Pieza" },
      "owner@example.com",
    );
  });
  it("rejects malformed, overlong and unsupported operations before mutation", async () => {
    const h = setup();
    expect((await h.post(request({ action: "delete", id: "a" }))).status).toBe(
      422,
    );
    expect(
      (
        await h.post(
          request({
            action: "create",
            kind: "product",
            document: { name: "x".repeat(260000) },
          }),
        )
      ).status,
    ).toBeGreaterThanOrEqual(400);
    expect(h.repo.create).not.toHaveBeenCalled();
  });
  it("validates publication before preparing images and preserves revision conflicts", async () => {
    const h = setup();
    expect(
      (
        await h.post(
          request({
            id: "a",
            version: 1,
            action: "publish",
            document: { name: "a" },
          }),
        )
      ).status,
    ).toBe(422);
    expect(h.prepare).not.toHaveBeenCalled();
    h.repo.change.mockRejectedValue(new CatalogError("Recargá la ficha.", 409));
    const r = await h.post(
      request({ id: "a", version: 1, action: "save", document: { name: "a" } }),
    );
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: "Recargá la ficha." });
  });
});
