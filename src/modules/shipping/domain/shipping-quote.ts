import type { CheckoutItem } from "../../checkout/domain/checkout";
import type { CourierQuoteSnapshot, ShippingDestination } from "./courier-quote";

export type ShippingQuote = {
  amountCents: number;
  expiresAt: Date;
  source: "controlled_test";
} | { source: "zipnova"; amountCents: number; expiresAt: Date; snapshot: CourierQuoteSnapshot };

export type IssuedShippingQuote = ShippingQuote & {
  token: string;
};

export interface ShippingQuoteVerifier {
  verify(token: string, now?: Date): ShippingQuote;
  verifyForCheckout?(quote: ShippingQuote, context: { items: CheckoutItem[]; destination: ShippingDestination }): Promise<ShippingQuote>;
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
