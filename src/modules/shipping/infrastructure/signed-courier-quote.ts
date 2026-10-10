import { createHmac, timingSafeEqual } from "node:crypto";

import { checkoutExpiresAt } from "../../checkout/domain/checkout-expiration";
import {
  CourierQuoteMismatchError,
  type CourierQuoteIssuer,
  type CourierQuoteSnapshot,
  type IssuedCourierQuote,
} from "../domain/courier-quote";
import { normalizeShippingLines, type ShippingLine } from "../domain/parcel-plan";
import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
} from "../domain/shipping-quote";

type QuotePayload = Omit<CourierQuoteSnapshot, "expiresAt"> & {
  version: 2;
  expiresAt: string;
};

export type ExpectedCourierQuote = {
  environment: "qa" | "production";
  deliveryType: "home";
  originPostalCode: string;
  destinationPostalCode: string;
  items: ShippingLine[];
  planFingerprint: string;
  serviceCode: string;
};

const MAX_TOKEN_LENGTH = 8192;
const FINGERPRINT = /^[a-f0-9]{64}$/;

export class SignedCourierQuoteService implements CourierQuoteIssuer {
  constructor(private readonly secret: string) {
    if (secret.length < 32) {
      throw new Error("Courier quote secret must contain at least 32 characters");
    }
  }

  issue(snapshot: CourierQuoteSnapshot): IssuedCourierQuote {
    const items = canonicalItems(snapshot.items);
    if (!isSnapshot(snapshot) || !sameItems(items, snapshot.items)) {
      throw new InvalidShippingQuoteError();
    }
    const payload: QuotePayload = {
      version: 2,
      provider: "correo_argentino",
      environment: snapshot.environment,
      deliveryType: "home",
      originPostalCode: snapshot.originPostalCode,
      destinationPostalCode: snapshot.destinationPostalCode,
      items,
      planFingerprint: snapshot.planFingerprint,
      parcelCount: snapshot.parcelCount,
      serviceCode: snapshot.serviceCode,
      serviceName: snapshot.serviceName,
      amountCents: snapshot.amountCents,
      expiresAt: snapshot.expiresAt.toISOString(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `${encodedPayload}.${this.sign(encodedPayload)}`;
    if (token.length > MAX_TOKEN_LENGTH) {
      throw new InvalidShippingQuoteError();
    }
    return { ...snapshot, items, token };
  }

  authenticate(token: string, now = new Date()): CourierQuoteSnapshot {
    if (
      typeof token !== "string" || token.length > MAX_TOKEN_LENGTH ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
    ) {
      throw new InvalidShippingQuoteError();
    }
    const [encodedPayload, encodedSignature] = token.split(".");
    const actual = Buffer.from(encodedSignature, "base64url");
    const expected = Buffer.from(this.sign(encodedPayload), "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new InvalidShippingQuoteError();
    }
    const payload = parsePayload(encodedPayload);
    const expiresAt = new Date(payload.expiresAt);
    if (
      !Number.isFinite(now.getTime()) ||
      expiresAt.getTime() < checkoutExpiresAt(now).getTime()
    ) {
      throw new ExpiredShippingQuoteError();
    }
    return {
      provider: payload.provider,
      environment: payload.environment,
      deliveryType: payload.deliveryType,
      originPostalCode: payload.originPostalCode,
      destinationPostalCode: payload.destinationPostalCode,
      items: payload.items,
      planFingerprint: payload.planFingerprint,
      parcelCount: payload.parcelCount,
      serviceCode: payload.serviceCode,
      serviceName: payload.serviceName,
      amountCents: payload.amountCents,
      expiresAt,
    };
  }

  verify(
    token: string,
    expected: ExpectedCourierQuote,
    now = new Date(),
  ): CourierQuoteSnapshot {
    const snapshot = this.authenticate(token, now);
    const items = canonicalItems(expected.items);
    if (
      snapshot.environment !== expected.environment ||
      snapshot.deliveryType !== expected.deliveryType ||
      snapshot.originPostalCode !== expected.originPostalCode ||
      snapshot.destinationPostalCode !== expected.destinationPostalCode ||
      snapshot.planFingerprint !== expected.planFingerprint ||
      snapshot.serviceCode !== expected.serviceCode ||
      !sameItems(snapshot.items, items)
    ) {
      throw new CourierQuoteMismatchError();
    }
    return snapshot;
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret)
      .update(`canela-courier-quote-v2:${payload}`)
      .digest("base64url");
  }
}

function parsePayload(encodedPayload: string): QuotePayload {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    if (!isPayload(value) || !sameItems(canonicalItems(value.items), value.items)) {
      throw new InvalidShippingQuoteError();
    }
    return value;
  } catch {
    throw new InvalidShippingQuoteError();
  }
}

function canonicalItems(items: ShippingLine[]): ShippingLine[] {
  try {
    return normalizeShippingLines(items, Number.MAX_SAFE_INTEGER);
  } catch {
    throw new InvalidShippingQuoteError();
  }
}

function sameItems(first: ShippingLine[], second: ShippingLine[]): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function isPayload(value: unknown): value is QuotePayload {
  if (!isRecord(value) || value.version !== 2 ||
    typeof value.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(value.expiresAt))) {
    return false;
  }
  return isSnapshot({ ...value, expiresAt: new Date(value.expiresAt) });
}

function isSnapshot(value: unknown): value is CourierQuoteSnapshot {
  if (!isRecord(value)) return false;
  return (
    value.provider === "correo_argentino" &&
    (value.environment === "qa" || value.environment === "production") &&
    value.deliveryType === "home" &&
    nonempty(value.originPostalCode) &&
    nonempty(value.destinationPostalCode) &&
    Array.isArray(value.items) &&
    typeof value.planFingerprint === "string" &&
    FINGERPRINT.test(value.planFingerprint) &&
    Number.isSafeInteger(value.parcelCount) &&
    (value.parcelCount as number) > 0 &&
    nonempty(value.serviceCode) &&
    nonempty(value.serviceName) &&
    Number.isSafeInteger(value.amountCents) &&
    (value.amountCents as number) >= 0 &&
    value.expiresAt instanceof Date &&
    Number.isFinite(value.expiresAt.getTime())
  );
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
