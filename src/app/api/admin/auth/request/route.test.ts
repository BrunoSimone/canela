import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { issueLink, send } = vi.hoisted(() => ({ issueLink: vi.fn(), send: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/admin/infrastructure/admin-auth", () => ({ AdminAuthRepository: class { issueLink = issueLink; } }));
vi.mock("@/modules/admin/infrastructure/resend-admin-mailer", () => ({ sendAdminLoginEmail: send }));
import { POST } from "./route";

describe("admin access requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "unused");
    vi.stubEnv("RESEND_API_KEY", "unused");
    vi.stubEnv("ADMIN_EMAIL_FROM", "Canela <admin@canela.test>");
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "owner@canela.test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://canela.test");
  });
  afterEach(() => vi.unstubAllEnvs());
  function request(body: string, origin = "https://canela.test", contentType = "application/json") {
    return new Request("https://canela.test/api/admin/auth/request", {
      method: "POST", headers: { Origin: origin, "Content-Type": contentType }, body,
    });
  }
  it("rejects cross-origin attempts before issuing a link", async () => {
    expect((await POST(request('{"email":"owner@canela.test"}', "https://elsewhere.test"))).status).toBe(403);
    expect(issueLink).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects plain forms and oversized JSON before querying the database", async () => {
    expect((await POST(request('{"email":"owner@canela.test"}', undefined, "text/plain"))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ email: "owner@canela.test", padding: "x".repeat(2048) })))).status).toBe(400);
    expect(issueLink).not.toHaveBeenCalled();
  });
  it("keeps the same response for an unknown or rate limited email", async () => {
    issueLink.mockResolvedValue(null);
    const response = await POST(request('{"email":"unknown@canela.test"}'));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});
