import { describe, expect, it } from "vitest";

import { CourierQuoteMismatchError } from "../domain/courier-quote";
import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
} from "../domain/shipping-quote";
import { SignedCourierQuoteService } from "./signed-courier-quote";
import { SignedShippingQuoteService } from "./signed-shipping-quote";

const now = new Date("2026-09-27T12:00:00.000Z");
const service = new SignedCourierQuoteService("secret".repeat(10));
const snapshot = {
  provider: "correo_argentino" as const,
  environment: "qa" as const,
  deliveryType: "home" as const,
  originPostalCode: "7600",
  destinationPostalCode: "1000",
  items: [{ productId: "plate", quantity: 2 }],
  planFingerprint: "a".repeat(64),
  parcelCount: 2,
  serviceCode: "approved-home",
  serviceName: "Domicilio",
  amountCents: 43_575,
  expiresAt: new Date("2026-09-27T12:30:00.000Z"),
};
const expected = {
  environment: "qa" as const,
  deliveryType: "home" as const,
  originPostalCode: "7600",
  destinationPostalCode: "1000",
  items: [{ productId: "plate", quantity: 2 }],
  planFingerprint: "a".repeat(64),
  serviceCode: "approved-home",
};

describe("SignedCourierQuoteService", () => {
  it("authenticates the snapshot without storing credentials in the token", () => {
    const issued = service.issue(snapshot);
    const verified = service.verify(issued.token, expected, now);
    const payload = JSON.parse(
      Buffer.from(issued.token.split(".")[0], "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    expect(verified).toEqual(snapshot);
    expect(Object.keys(payload).sort()).toEqual([
      "amountCents", "deliveryType", "destinationPostalCode", "environment",
      "expiresAt", "items", "originPostalCode", "parcelCount",
      "planFingerprint", "provider", "serviceCode", "serviceName", "version",
    ].sort());
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("rejects altered signatures and the controlled test token version", () => {
    const issued = service.issue(snapshot);
    const [payload, signature] = issued.token.split(".");
    const altered = `${payload}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
    expect(() => service.authenticate(altered, now))
      .toThrow(InvalidShippingQuoteError);
    const changedAmount = Buffer.from(
      Buffer.from(payload, "base64url").toString("utf8").replace("43575", "43576"),
    ).toString("base64url");
    expect(() => service.authenticate(`${changedAmount}.${signature}`, now))
      .toThrow(InvalidShippingQuoteError);

    const controlled = new SignedShippingQuoteService("secret".repeat(10))
      .issueControlled(43_575, now);
    expect(() => service.authenticate(controlled.token, now))
      .toThrow(InvalidShippingQuoteError);
  });

  it("rejects another cart, destination, packing plan or service", () => {
    const token = service.issue(snapshot).token;
    for (const change of [
      { items: [{ productId: "plate", quantity: 1 }] },
      { destinationPostalCode: "1001" },
      { planFingerprint: "b".repeat(64) },
      { serviceCode: "other" },
      { originPostalCode: "7601" },
      { environment: "production" as const },
    ]) {
      expect(() => service.verify(token, { ...expected, ...change }, now))
        .toThrow(CourierQuoteMismatchError);
    }
  });

  it("rejects a quote that cannot cover another ten-minute checkout", () => {
    const token = service.issue(snapshot).token;

    expect(() => service.authenticate(token, new Date("2026-09-27T12:20:00.001Z")))
      .toThrow(ExpiredShippingQuoteError);
  });

  it("rejects malformed input before issuing a token", () => {
    expect(() => service.issue({ ...snapshot, amountCents: 1.5 }))
      .toThrow(InvalidShippingQuoteError);
    expect(() => service.issue({ ...snapshot, planFingerprint: "invalid" }))
      .toThrow(InvalidShippingQuoteError);
  });
});
