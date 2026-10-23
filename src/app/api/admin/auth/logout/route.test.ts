import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revokeSession = vi.hoisted(() => vi.fn());
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/admin/infrastructure/admin-auth", () => ({
  AdminAuthRepository: class { revokeSession = revokeSession; },
}));

import { POST } from "./route";

function request(site: string): Request {
  return new Request("http://localhost:3000/api/admin/auth/logout", {
    method: "POST",
    headers: {
      Origin: "null",
      "Sec-Fetch-Site": site,
      Cookie: `canela_admin_session=${"b".repeat(43)}`,
    },
  });
}

describe("admin logout", () => {
  beforeEach(() => {
    revokeSession.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://unused");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("revokes the session from a same-origin form with no-referrer", async () => {
    const response = await POST(request("same-origin"));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/admin/ingresar");
    expect(revokeSession).toHaveBeenCalledWith("b".repeat(43));
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("rejects a cross-site form before revoking a session", async () => {
    expect((await POST(request("cross-site"))).status).toBe(403);
    expect(revokeSession).not.toHaveBeenCalled();
  });

  it("keeps the public origin when logging out through the configured proxy", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canela-tunnel.example");
    const req = request("same-origin");
    req.headers.set("X-Forwarded-Host", "canela-tunnel.example");
    expect((await POST(req)).headers.get("Location")).toBe("https://canela-tunnel.example/admin/ingresar");
  });
});
