import { describe, expect, it } from "vitest";
import { ExpiredShippingQuoteError, InvalidShippingQuoteError } from "../domain/shipping-quote";
import { now, quoteFixture } from "../testing/fixtures";
import { SignedShippingQuoteService } from "./signed-shipping-quote";
import { SignedCourierQuoteService } from "./signed-courier-quote";

describe("signed courier snapshots v3", () => {
  it("rejects inconsistent margin metadata before issuing a token", async () => {
    const { deps, snapshot } = await quoteFixture(), parcel = snapshot.parcels[0];
    const base = { weightGrams: parcel.weightGrams, heightCm: parcel.heightCm, widthCm: parcel.widthCm, lengthCm: parcel.lengthCm };
    expect(() => deps.issuer.issue({ ...snapshot, parcels: [{ ...parcel, quoteMargin: { status: "applied", base: { ...base, weightGrams: -1 } } }] })).toThrow();
    expect(() => deps.issuer.issue({ ...snapshot, parcels: [{ ...parcel, quoteMargin: { status: "applied", base: { ...base, weightGrams: parcel.weightGrams + 1 } } }] })).toThrow();
    expect(() => deps.issuer.issue({ ...snapshot, parcels: [{ ...parcel, quoteMargin: { status: "price_changed", base: { ...base, weightGrams: parcel.weightGrams - 1 } } }] })).toThrow();
  });
  it("authenticates the complete snapshot without exposing credentials", async () => {
    const { deps, token, snapshot } = await quoteFixture();
    expect(deps.issuer.authenticate(token, now)).toEqual(snapshot);
    expect(JSON.stringify(snapshot)).not.toMatch(/apiToken|apiSecret|Authorization/);
  });
  it.each(["amountCents", "carrierId", "merchandiseCents", "parcels", "destination", "contextFingerprint"])("rejects tampering with %s", async field => {
    const { deps, token } = await quoteFixture(); const [encoded, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()); payload[field] = 0;
    const altered = Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + signature;
    expect(() => deps.issuer.authenticate(altered, now)).toThrow(InvalidShippingQuoteError);
  });
  it("rejects a controlled tariff, a different key, expiration and oversized tokens", async () => {
    const { deps, token } = await quoteFixture();
    expect(() => deps.issuer.authenticate(new SignedShippingQuoteService("a".repeat(64)).issueControlled(1, now).token, now)).toThrow(InvalidShippingQuoteError);
    expect(() => new SignedCourierQuoteService("b".repeat(64)).authenticate(token, now)).toThrow(InvalidShippingQuoteError);
    expect(() => deps.issuer.authenticate(token, new Date("2026-10-13T17:10:00Z"))).toThrow(ExpiredShippingQuoteError);
    expect(() => deps.issuer.authenticate("a".repeat(33000) + ".b", now)).toThrow(InvalidShippingQuoteError);
  });
  it("does not issue invalid monetary values or longer validity", async () => {
    const { deps, snapshot } = await quoteFixture();
    expect(() => deps.issuer.issue({ ...snapshot, amountCents: 0.1 })).toThrow();
    expect(() => deps.issuer.issue({ ...snapshot, expiresAt: "2026-10-13T18:00:00Z" })).toThrow();
  });
});
