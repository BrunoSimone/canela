import { describe, expect, it } from "vitest";

import { createOrderToken, hashOrderToken } from "./order-token";

describe("order token", () => {
  it("derives a stable opaque token for an idempotent browser attempt", () => {
    const secret = "a".repeat(64);
    const idempotencyKey = "97683b2b-6e37-493b-ae7a-271f249ee7db";

    const first = createOrderToken(secret, idempotencyKey);
    const second = createOrderToken(secret, idempotencyKey);

    expect(first).toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toContain(idempotencyKey);
    expect(hashOrderToken(first)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("separates attempts and rejects weak secrets", () => {
    const secret = "a".repeat(64);

    expect(createOrderToken(secret, "attempt-a")).not.toBe(
      createOrderToken(secret, "attempt-b"),
    );
    expect(() => createOrderToken("short", "attempt-a")).toThrow(
      "at least 32 characters",
    );
  });
});
