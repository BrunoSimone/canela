import { describe, expect, it } from "vitest";
import { mapMercadoPagoOrderState } from "./status";

describe("mapMercadoPagoOrderState", () => {
  it.each([
    ["created", null, "created"],
    ["action_required", "waiting_retry", "action_required"],
    ["processing", "in_process", "processing"],
    ["processed", "accredited", "approved"],
    ["failed", "rejected_by_bank", "rejected"],
    ["canceled", null, "cancelled"],
    ["expired", null, "expired"],
  ] as const)("maps %s/%s to %s", (status, detail, expected) => {
    expect(mapMercadoPagoOrderState(status, detail)).toBe(expected);
  });

  it("requires review for unknown or inconsistent terminal states", () => {
    expect(mapMercadoPagoOrderState("processed", "pending_review")).toBe(
      "review_required",
    );
    expect(mapMercadoPagoOrderState("new-provider-state", null)).toBe(
      "review_required",
    );
  });
});
