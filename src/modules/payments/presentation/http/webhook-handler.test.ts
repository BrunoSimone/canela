import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { handleMercadoPagoWebhook } from "./webhook-handler";

const dataId = "ORD01M28P44G5FG8RJPM579EH56FV";
const requestId = "2066ca19-c6f1-498a-be75-1923005edd06";
const secret = "test-webhook-secret";
const timestamp = "1742505638683";

function signature(): string {
  return `ts=${timestamp},v1=${createHmac("sha256", secret)
    .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
    .digest("hex")}`;
}

function request(options: {
  signature?: string;
  type?: string;
  body?: unknown;
} = {}): Request {
  const type = options.type ?? "order";
  return new Request(
    `https://canela.test/api/webhooks/mercado-pago?data.id=${dataId}&type=${type}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
        "x-signature": options.signature ?? signature(),
      },
      body: JSON.stringify(
        options.body ?? {
          action: "order.processed",
          application_id: "app-456",
          data: { id: dataId },
          live_mode: false,
          type: "order",
          user_id: "seller-123",
        },
      ),
    },
  );
}

describe("handleMercadoPagoWebhook", () => {
  it("rejects an invalid signature without confirming or touching persistence", async () => {
    const confirm = vi.fn();

    const response = await handleMercadoPagoWebhook(
      request({ signature: `ts=${timestamp},v1=${"0".repeat(64)}` }),
      { secret, expectedLiveMode: false, confirm },
    );

    expect(response.status).toBe(401);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("rejects a malformed or mismatched Order event", async () => {
    const confirm = vi.fn();
    const response = await handleMercadoPagoWebhook(
      request({ body: { type: "order", data: { id: "another-order" } } }),
      { secret, expectedLiveMode: false, confirm },
    );

    expect(response.status).toBe(400);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("confirms a valid Order event and acknowledges durable processing", async () => {
    const confirm = vi.fn().mockResolvedValue({ kind: "applied" });

    const response = await handleMercadoPagoWebhook(request(), {
      secret,
      expectedLiveMode: false,
      confirm,
    });

    expect(response.status).toBe(200);
    expect(confirm).toHaveBeenCalledWith({
      deliveryId: requestId,
      providerOrderId: dataId,
    });
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("returns a retryable error when confirmation is not durable", async () => {
    const confirm = vi.fn().mockRejectedValue(new Error("provider unavailable"));

    const response = await handleMercadoPagoWebhook(request(), {
      secret,
      expectedLiveMode: false,
      confirm,
      reportUnexpectedError: vi.fn(),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ code: "WEBHOOK_RETRY" });
  });

  it("rejects a notification from a different live mode", async () => {
    const confirm = vi.fn();
    const response = await handleMercadoPagoWebhook(
      request({
        body: {
          action: "order.processed",
          data: { id: dataId },
          live_mode: true,
          type: "order",
        },
      }),
      { secret, expectedLiveMode: false, confirm },
    );

    expect(response.status).toBe(400);
    expect(confirm).not.toHaveBeenCalled();
  });
});
