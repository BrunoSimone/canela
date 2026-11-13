import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { session, handle } = vi.hoisted(() => ({
  session: vi.fn<() => Promise<{ email: string } | null>>(),
  handle: vi.fn(async () => Response.json({ options: [] })),
}));
vi.mock("@/modules/admin/infrastructure/admin-request", () => ({ currentAdminSession: session }));
vi.mock("@/modules/checkout/infrastructure/server/checkout-config", () => ({
  readCheckoutConfig: () => ({ mode: "production", shippingProvider: "zipnova", signingSecret: "s".repeat(32) }),
}));
vi.mock("@/modules/shipping/infrastructure/server/shipping-service", () => ({ createShippingDependencies: () => ({}) }));
vi.mock("@/modules/shipping/presentation/http/quote-handler", () => ({ handleShippingQuote: handle }));

import { POST } from "./route";

const request = () => new Request("https://canela.test/api/shipping/quotes", { method: "POST", body: "{}" });

beforeEach(() => { session.mockReset(); handle.mockClear(); });
afterEach(() => vi.unstubAllEnvs());

describe("shipping quotes during maintenance", () => {
  it("stays closed for visitors without a panel session or when the session lookup fails", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    session.mockResolvedValueOnce(null);
    expect((await POST(request())).status).toBe(404);
    session.mockRejectedValueOnce(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(404);
    expect(handle).not.toHaveBeenCalled();
  });

  it("quotes for an authenticated panel preview", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    session.mockResolvedValueOnce({ email: "qa@canela.test" });
    expect((await POST(request())).status).toBe(200);
    expect(handle).toHaveBeenCalledOnce();
  });

  it("does not require a session once the store is open", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "0");
    expect((await POST(request())).status).toBe(200);
    expect(session).not.toHaveBeenCalled();
  });
});
