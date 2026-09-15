import { describe, expect, it } from "vitest";

import {
  getPublicOrderStatus,
  presentOrderStatus,
} from "./get-public-order-status";

describe("presentOrderStatus", () => {
  it.each([
    ["created", "verifying", false],
    ["payment_pending", "verifying", false],
    ["paid", "paid", false],
    ["fulfillment_pending", "paid", false],
    ["shipped", "paid", false],
    ["delivered", "paid", false],
    ["rejected", "not_completed", true],
    ["expired", "not_completed", true],
    ["review_required", "review_required", false],
    ["refund_pending", "review_required", false],
    ["refunded", "review_required", false],
  ] as const)(
    "maps %s to the public state %s",
    (internalStatus, status, canRetry) => {
      expect(presentOrderStatus(internalStatus)).toEqual({ status, canRetry });
    },
  );

  it("returns no order for an unknown public token hash", async () => {
    const result = await getPublicOrderStatus(
      { findByTokenHash: async () => null },
      "a".repeat(64),
    );

    expect(result).toBeNull();
  });
});
