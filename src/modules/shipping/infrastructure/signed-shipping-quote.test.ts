import { describe, expect, it } from "vitest";

import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
} from "../domain/shipping-quote";
import { SignedShippingQuoteService } from "./signed-shipping-quote";

const secret = "a".repeat(64);
const now = new Date("2026-09-15T16:00:00.000Z");

describe("SignedShippingQuoteService", () => {
  it("issues and verifies a controlled quote without trusting the browser", () => {
    const service = new SignedShippingQuoteService(secret);
    const issued = service.issueControlled(400_000, now);

    expect(service.verify(issued.token, now)).toEqual({
      amountCents: 400_000,
      expiresAt: new Date("2026-09-15T16:15:00.000Z"),
      source: "controlled_test",
    });
  });

  it("rejects a token whose signed payload was modified", () => {
    const service = new SignedShippingQuoteService(secret);
    const issued = service.issueControlled(400_000, now);
    const [payload, signature] = issued.token.split(".");
    const tampered = `${payload.slice(0, -1)}A.${signature}`;

    expect(() => service.verify(tampered, now)).toThrow(
      InvalidShippingQuoteError,
    );
  });

  it("rejects an expired quote", () => {
    const service = new SignedShippingQuoteService(secret);
    const issued = service.issueControlled(400_000, now);

    expect(() =>
      service.verify(issued.token, new Date("2026-09-15T16:15:00.001Z")),
    ).toThrow(ExpiredShippingQuoteError);
  });
});
