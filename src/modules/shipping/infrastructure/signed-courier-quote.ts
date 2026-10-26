import { createHmac, timingSafeEqual } from "node:crypto";
import { COURIER_QUOTE_TTL_MS, normalizeShippingDestination, type CourierQuoteIssuer, type CourierQuoteSnapshot, type IssuedCourierQuote } from "../domain/courier-quote";
import { ExpiredShippingQuoteError, InvalidShippingQuoteError } from "../domain/shipping-quote";
import { validQuoteMargin } from "../domain/quote-margin";

export const MAX_COURIER_TOKEN_LENGTH = 32768;

export class SignedCourierQuoteService implements CourierQuoteIssuer {
  constructor(private readonly secret: string) {
    if (secret.length < 32) throw new Error("Courier quote secret must contain at least 32 characters");
  }
  issue(snapshot: CourierQuoteSnapshot): IssuedCourierQuote {
    if (!validSnapshot(snapshot)) throw new InvalidShippingQuoteError();
    const payload = Buffer.from(JSON.stringify(snapshot)).toString("base64url");
    const token = `${payload}.${this.sign(payload)}`;
    if (token.length > MAX_COURIER_TOKEN_LENGTH) throw new InvalidShippingQuoteError();
    return { ...snapshot, token };
  }
  authenticate(token: string, now = new Date()): CourierQuoteSnapshot {
    if (typeof token !== "string" || token.length > MAX_COURIER_TOKEN_LENGTH ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new InvalidShippingQuoteError();
    const [payload, signature] = token.split(".");
    const actual = Buffer.from(signature, "base64url");
    const expected = Buffer.from(this.sign(payload), "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new InvalidShippingQuoteError();
    let snapshot: CourierQuoteSnapshot;
    try {
      snapshot = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (!validSnapshot(snapshot)) throw new Error();
    } catch { throw new InvalidShippingQuoteError(); }
    if (!Number.isFinite(now.getTime()) || Date.parse(snapshot.expiresAt) <= now.getTime() ||
        Date.parse(snapshot.issuedAt) > now.getTime() + 5000) throw new ExpiredShippingQuoteError();
    return snapshot;
  }
  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update(`canela-courier-quote-v3:${payload}`).digest("base64url");
  }
}

function validSnapshot(s: CourierQuoteSnapshot): boolean {
  try {
    if (!s || s.version !== 3 || s.provider !== "zipnova" ||
        !["operational", "sandbox"].includes(s.accountMode) ||
        ![s.contextFingerprint, s.cartFingerprint, s.planFingerprint].every(v => typeof v === "string" && /^[a-f0-9]{64}$/.test(v)) ||
        !["carrier_dropoff", "carrier_pickup"].includes(s.dispatchType) || s.serviceCode !== "standard_delivery" ||
        !Number.isSafeInteger(s.carrierId) || s.carrierId <= 0 ||
        !s.carrierName?.trim() || !s.serviceName?.trim() ||
        ![s.amountCents, s.sellerAmountCents, s.merchandiseCents].every(v => Number.isSafeInteger(v) && v >= 0) ||
        !Array.isArray(s.items) || !s.items.length || s.items.length > 20 ||
        !Array.isArray(s.parcels) || !s.parcels.length || s.parcels.length > 20) return false;
    normalizeShippingDestination(s.destination);
    const issuedAt = Date.parse(s.issuedAt), expiresAt = Date.parse(s.expiresAt);
    return Number.isFinite(issuedAt) && Number.isFinite(expiresAt) && expiresAt > issuedAt &&
      expiresAt - issuedAt <= COURIER_QUOTE_TTL_MS &&
      s.items.every(i => typeof i.productId === "string" && i.productId.length > 0 && i.productId.length <= 200 && Number.isSafeInteger(i.quantity) && i.quantity > 0) &&
      s.parcels.every(p => [p.weightGrams, p.heightCm, p.widthCm, p.lengthCm].every(v => Number.isSafeInteger(v) && v > 0) && typeof p.classificationId === "string" && p.classificationId.length > 0 && validQuoteMargin(p));
  } catch { return false; }
}
