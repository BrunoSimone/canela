import { afterEach, describe, expect, it, vi } from "vitest";
import { studioIdentity, studioOrigin } from "./studio-auth";
afterEach(() => vi.unstubAllEnvs());
const request = (origin = "https://canela-artesanal.sanity.studio") => new Request("https://www.canela-store.com/api/studio/inventory", { headers: { Origin: origin, Authorization: "Bearer user-session" } });
describe("INV Studio authorization", () => {
  it("accepts only a server-verified allowed project administrator", async () => {
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "owner@example.com");
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "owner", email: "owner@example.com" })).mockResolvedValueOnce(Response.json({ members: [{ id: "owner", roles: [{ name: "administrator" }] }] }));
    expect(await studioIdentity(request(), fetcher)).toEqual({ email: "owner@example.com" });
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer user-session");
  });
  it.each(["viewer", "editor"])("rejects %s access even if the email is allowlisted", async role => {
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "owner@example.com");
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "owner", email: "owner@example.com" })).mockResolvedValueOnce(Response.json({ members: [{ id: "owner", roles: [{ name: role }] }] }));
    expect(await studioIdentity(request(), fetcher)).toBeNull();
  });
  it("rejects a forged identity, untrusted origin, robot token and network errors", async () => {
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "owner@example.com");
    expect(studioOrigin(request("https://evil.test"))).toBeNull();
    const fetcher = vi.fn().mockResolvedValue(Response.json({ id: "robot" }));
    expect(await studioIdentity(request(), fetcher)).toBeNull();
    expect(await studioIdentity(request("https://evil.test"), fetcher)).toBeNull();
    fetcher.mockResolvedValue(Response.json({ id: "other", email: "other@example.com" }));
    expect(await studioIdentity(request(), fetcher)).toBeNull();
    fetcher.mockRejectedValue(Error("network"));
    expect(await studioIdentity(request(), fetcher)).toBeNull();
  });
});
