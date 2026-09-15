import { describe, expect, it, vi } from "vitest";

import type { PublicOrderStatusRepository } from "../../application/get-public-order-status";
import { hashOrderToken } from "../../infrastructure/order-token";
import { handlePublicOrderStatusRequest } from "./public-order-status-handler";

const publicToken = "a".repeat(43);

describe("handlePublicOrderStatusRequest", () => {
  it("returns only the presentable state for a valid opaque token", async () => {
    const repository: PublicOrderStatusRepository = {
      findByTokenHash: vi.fn().mockResolvedValue({
        status: "payment_pending",
        expiresAt: new Date("2026-09-15T16:10:00.000Z"),
      }),
    };

    const response = await handlePublicOrderStatusRequest(
      publicToken,
      repository,
    );

    expect(repository.findByTokenHash).toHaveBeenCalledWith(
      hashOrderToken(publicToken),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "verifying",
      canRetry: false,
      expiresAt: "2026-09-15T16:10:00.000Z",
    });
  });

  it("does not reveal whether malformed and unknown tokens differ", async () => {
    const repository: PublicOrderStatusRepository = {
      findByTokenHash: vi.fn().mockResolvedValue(null),
    };

    const malformed = await handlePublicOrderStatusRequest("invalid", repository);
    const unknown = await handlePublicOrderStatusRequest(publicToken, repository);

    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    await expect(malformed.json()).resolves.toEqual({ code: "ORDER_NOT_FOUND" });
    await expect(unknown.json()).resolves.toEqual({ code: "ORDER_NOT_FOUND" });
  });
});
