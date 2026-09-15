import { createHmac, timingSafeEqual } from "node:crypto";

import {
  ExpiredShippingQuoteError,
  InvalidShippingQuoteError,
  type IssuedShippingQuote,
  type ShippingQuote,
  type ShippingQuoteVerifier,
} from "../domain/shipping-quote";

const CONTROLLED_QUOTE_TTL_MS = 15 * 60 * 1000;

type QuotePayload = {
  version: 1;
  source: "controlled_test";
  amountCents: number;
  expiresAt: string;
};

export class SignedShippingQuoteService implements ShippingQuoteVerifier {
  constructor(private readonly secret: string) {
    if (secret.length < 32) {
      throw new Error("Shipping quote secret must contain at least 32 characters");
    }
  }

  issueControlled(amountCents: number, now = new Date()): IssuedShippingQuote {
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
      throw new Error("Controlled shipping amount must be a non-negative integer");
    }

    const expiresAt = new Date(now.getTime() + CONTROLLED_QUOTE_TTL_MS);
    const payload: QuotePayload = {
      version: 1,
      source: "controlled_test",
      amountCents,
      expiresAt: expiresAt.toISOString(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url",
    );

    return {
      amountCents,
      expiresAt,
      source: "controlled_test",
      token: `${encodedPayload}.${this.sign(encodedPayload)}`,
    };
  }

  verify(token: string, now = new Date()): ShippingQuote {
    const parts = token.split(".");
    if (parts.length !== 2) {
      throw new InvalidShippingQuoteError();
    }

    const [encodedPayload, encodedSignature] = parts;
    const expectedSignature = this.sign(encodedPayload);
    const actual = Buffer.from(encodedSignature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new InvalidShippingQuoteError();
    }

    const payload = parsePayload(encodedPayload);
    const expiresAt = new Date(payload.expiresAt);
    if (expiresAt.getTime() <= now.getTime()) {
      throw new ExpiredShippingQuoteError();
    }

    return {
      amountCents: payload.amountCents,
      expiresAt,
      source: payload.source,
    };
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret)
      .update(`canela-shipping-quote:${payload}`)
      .digest("base64url");
  }
}

function parsePayload(encodedPayload: string): QuotePayload {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    if (!isQuotePayload(value)) {
      throw new InvalidShippingQuoteError();
    }
    return value;
  } catch (error) {
    if (error instanceof InvalidShippingQuoteError) {
      throw error;
    }
    throw new InvalidShippingQuoteError();
  }
}

function isQuotePayload(value: unknown): value is QuotePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    payload.version === 1 &&
    payload.source === "controlled_test" &&
    Number.isSafeInteger(payload.amountCents) &&
    (payload.amountCents as number) >= 0 &&
    typeof payload.expiresAt === "string" &&
    Number.isFinite(Date.parse(payload.expiresAt))
  );
}
