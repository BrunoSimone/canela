import { describe, it, expect, vi } from "vitest";
import { uploadHandler } from "./upload-http";
import { parseUpload } from "./admin-upload";
const req = (body: unknown, origin = "https://canela.test") =>
  new Request("https://canela.test/api/admin/media", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
describe("CAT-154 private originals upload authorization", () => {
  it("accepts only bounded known image declarations", () => {
    expect(
      parseUpload({ hash: "a".repeat(64), bytes: 10, contentType: "image/png" })
        .bytes,
    ).toBe(10);
    for (const patch of [
      { bytes: 0 },
      { bytes: 33554433 },
      { bytes: NaN },
      { hash: "../../private" },
      { contentType: "image/svg+xml" },
    ])
      expect(() =>
        parseUpload({
          hash: "a".repeat(64),
          bytes: 10,
          contentType: "image/png",
          ...patch,
        }),
      ).toThrow();
  });
  it("never signs an upload without session and same origin", async () => {
    const begin = vi.fn(),
      session = vi.fn().mockResolvedValue(null),
      handler = uploadHandler({
        session,
        enabled: () => true,
        service: () => ({ begin }) as never,
        origin: (r) => r.headers.get("origin") === "https://canela.test",
      });
    expect((await handler(req({ action: "begin" }))).status).toBe(401);
    session.mockResolvedValue({ email: "owner" });
    expect(
      (await handler(req({ action: "begin" }, "https://evil.test"))).status,
    ).toBe(403);
    expect(begin).not.toHaveBeenCalled();
  });
  it("binds finalization to the current administrator, not a supplied owner", async () => {
    const finish = vi.fn().mockResolvedValue({ assetId: "a" }),
      handler = uploadHandler({
        session: async () => ({ email: "real-owner" }),
        enabled: () => true,
        service: () => ({ finish }) as never,
        origin: () => true,
      });
    await handler(req({ action: "finish", id: "upload-id", actor: "other" }));
    expect(finish).toHaveBeenCalledWith("upload-id", "real-owner");
  });
});
