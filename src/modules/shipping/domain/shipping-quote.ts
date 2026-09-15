export type ShippingQuote = {
  amountCents: number;
  expiresAt: Date;
  source: "controlled_test";
};

export type IssuedShippingQuote = ShippingQuote & {
  token: string;
};

export interface ShippingQuoteVerifier {
  verify(token: string, now?: Date): ShippingQuote;
}

export class InvalidShippingQuoteError extends Error {
  constructor() {
    super("Shipping quote token is invalid");
    this.name = "InvalidShippingQuoteError";
  }
}

export class ExpiredShippingQuoteError extends Error {
  constructor() {
    super("Shipping quote has expired");
    this.name = "ExpiredShippingQuoteError";
  }
}
