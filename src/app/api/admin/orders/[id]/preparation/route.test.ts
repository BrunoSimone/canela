import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => vi.fn());

vi.mock("@/modules/admin/infrastructure/admin-request", () => ({
  currentAdminSession: session,
  privateJson: (body: unknown, status = 200) => Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  }),
}));

import { POST } from "./route";

const orderId = "d71466b7-f0e7-4434-bd72-047287217728";
const params = { params: Promise.resolve({ id: orderId }) };

function request(origin: string): Request {
  return new Request(`https://canela.test/api/admin/orders/${orderId}/preparation`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      expectedVersion: 0,
      parcels: [{ weightGrams: 900, heightCm: 20, widthCm: 30, lengthCm: 40 }],
    }),
  });
}

describe("admin preparation route", () => {
  beforeEach(() => session.mockReset());

  it("requires a valid owner session before reading the payload", async () => {
    session.mockResolvedValue(null);
    const response = await POST(request("https://canela.test"), params);
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects a cross-origin write even with an owner session", async () => {
    session.mockResolvedValue({ email: "owner@example.com" });
    const response = await POST(request("https://elsewhere.test"), params);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ code: "INVALID_ORIGIN" });
  });
});
