import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyMercadoPagoWebhookSignature } from "./webhook-signature";

const input = {
  dataId: "ORD01M28P44G5FG8RJPM579EH56FV",
  requestId: "2066ca19-c6f1-498a-be75-1923005edd06",
  secret: "test-webhook-secret",
  timestamp: "1742505638683",
};

function signature(overrides: Partial<typeof input> = {}): string {
  const value = { ...input, ...overrides };
  const manifest =
    `id:${value.dataId};request-id:${value.requestId};` +
    `ts:${value.timestamp};`;
  const hash = createHmac("sha256", value.secret)
    .update(manifest)
    .digest("hex");
  return `ts=${value.timestamp},v1=${hash}`;
}

describe("verifyMercadoPagoWebhookSignature", () => {
  it("accepts the documented HMAC-SHA256 manifest", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: signature(),
        xRequestId: input.requestId,
        dataId: input.dataId,
        secret: input.secret,
      }),
    ).toBe(true);
  });

  it("accepts the lowercase data id canonicalization emitted by Orders", () => {
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature: signature({ dataId: input.dataId.toLowerCase() }),
        xRequestId: input.requestId,
        dataId: input.dataId,
        secret: input.secret,
      }),
    ).toBe(true);
  });

  it.each([
    [null, input.requestId, input.dataId],
    ["", input.requestId, input.dataId],
    ["ts=invalid,v1=abc", input.requestId, input.dataId],
    [signature(), "different-request", input.dataId],
    [signature(), input.requestId, "different-order"],
    [`ts=${input.timestamp},v1=${"é" + "a".repeat(63)}`, input.requestId, input.dataId],
  ])("rejects missing, malformed or mismatched inputs", (xSignature, xRequestId, dataId) => {
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature,
        xRequestId,
        dataId,
        secret: input.secret,
      }),
    ).toBe(false);
  });
});
