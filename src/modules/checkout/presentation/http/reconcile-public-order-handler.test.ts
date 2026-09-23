import { describe, expect, it, vi } from "vitest";

import type { PublicOrderStatusRepository } from "../../application/get-public-order-status";
import { hashOrderToken } from "../../infrastructure/order-token";
import { PaymentOrderGatewayError } from "../../../payments/domain/payment-order";
import { handleReconcilePublicOrderRequest } from "./reconcile-public-order-handler";

const publicToken = "a".repeat(43);

function statusRepository(): PublicOrderStatusRepository {
  return {
    findByTokenHash: vi.fn().mockResolvedValue({
      status: "paid",
      expiresAt: new Date("2026-09-22T16:10:00.000Z"),
    }),
  };
}

describe("handleReconcilePublicOrderRequest", () => {
  it("reconciles by the opaque token and returns only public state", async () => {
    const reconcile = vi.fn().mockResolvedValue({ kind: "applied" });
    const repository = statusRepository();

    const response = await handleReconcilePublicOrderRequest(publicToken, {
      reconcile,
      statusRepository: repository,
    });

    expect(reconcile).toHaveBeenCalledWith(hashOrderToken(publicToken));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "paid",
      canRetry: false,
      expiresAt: "2026-09-22T16:10:00.000Z",
    });
  });

  it("does not reveal malformed or unknown public tokens", async () => {
    const reconcile = vi
      .fn()
      .mockResolvedValueOnce({ kind: "unknown_order" });
    const repository = statusRepository();

    const malformed = await handleReconcilePublicOrderRequest("invalid", {
      reconcile,
      statusRepository: repository,
    });
    const unknown = await handleReconcilePublicOrderRequest(publicToken, {
      reconcile,
      statusRepository: repository,
    });

    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("keeps a provider failure recoverable without returning payment data", async () => {
    const reconcile = vi
      .fn()
      .mockRejectedValue(new PaymentOrderGatewayError("ambiguous"));

    const response = await handleReconcilePublicOrderRequest(publicToken, {
      reconcile,
      statusRepository: statusRepository(),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "PAYMENT_RECONCILIATION_UNAVAILABLE",
    });
  });
});
