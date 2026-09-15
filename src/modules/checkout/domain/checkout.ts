import type { PaymentOrder } from "../../payments/domain/payment-order";

export type CheckoutItem = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type ReserveCheckoutInput = {
  orderId: string;
  publicTokenHash: string;
  idempotencyKey: string;
  buyerEmail: string;
  currency: "ARS";
  shippingCents: number;
  items: CheckoutItem[];
};

export type ReservedCheckout = {
  orderId: string;
  buyerEmail: string;
  currency: "ARS";
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  expiresAt: Date;
  providerIdempotencyKey: string;
  items: CheckoutItem[];
  providerOrderId: string | null;
  checkoutUrl: string | null;
  reused: boolean;
};

export interface CheckoutRepository {
  reserve(input: ReserveCheckoutInput): Promise<ReservedCheckout>;
  saveProviderOrder(orderId: string, order: PaymentOrder): Promise<void>;
  markProviderCreationUncertain(orderId: string): Promise<void>;
  releaseForDefinitiveProviderFailure(orderId: string): Promise<void>;
}

export class CheckoutInventoryUnavailableError extends Error {
  constructor(readonly productIds: string[]) {
    super(`Checkout inventory unavailable for: ${productIds.join(", ")}`);
    this.name = "CheckoutInventoryUnavailableError";
  }
}

export class CheckoutAttemptClosedError extends Error {
  constructor() {
    super("Checkout attempt is no longer active");
    this.name = "CheckoutAttemptClosedError";
  }
}
