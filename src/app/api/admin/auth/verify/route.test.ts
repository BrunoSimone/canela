import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const consumeLink = vi.hoisted(() => vi.fn());
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/admin/infrastructure/admin-auth", () => ({
  ADMIN_SESSION_MAX_AGE_SECONDS: 28_800,
  AdminAuthRepository: class { consumeLink = consumeLink; },
}));

import { POST } from "./route";

function request(site: string): Request {
  return new Request("http://localhost:3000/api/admin/auth/verify", {
    method: "POST",
    headers: { Origin: "null", "Sec-Fetch-Site": site },
    body: new URLSearchParams({ token: "a".repeat(43) }),
  });
}

describe("admin access confirmation", () => {
  beforeEach(() => {
    consumeLink.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://unused");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("creates a session from a same-origin form with no-referrer", async () => {
    consumeLink.mockResolvedValue({ session: "b".repeat(43), email: "owner@example.com" });
    const response = await POST(request("same-origin"));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/admin");
    expect(consumeLink).toHaveBeenCalledWith("a".repeat(43));
    expect(response.headers.get("Set-Cookie")).toContain("canela_admin_session=");
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("rejects a cross-site form before consuming the one-time link", async () => {
    expect((await POST(request("cross-site"))).status).toBe(403);
    expect(consumeLink).not.toHaveBeenCalled();
  });

  it("redirects a proxied login to the configured public host", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canela-tunnel.example");
    consumeLink.mockResolvedValue({ session: "b".repeat(43), email: "owner@example.com" });
    const req = request("same-origin");
    req.headers.set("X-Forwarded-Host", "canela-tunnel.example");
    const response = await POST(req);
    expect(response.headers.get("Location")).toBe("https://canela-tunnel.example/admin");
  });

  it("redirects expired or used links to request a new email", async () => {
    consumeLink.mockResolvedValue(null);
    const response = await POST(request("same-origin"));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/admin/ingresar?error=link");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
