import type { PaymentOrderState } from "./payment-order";

export type PaymentConfirmationTarget = {
  orderId: string;
  providerOrderId: string;
  totalCents: number;
  currency: "ARS";
};

export type ApplyPaymentConfirmationInput = {
  webhookDeliveryId: string | null;
  orderId: string;
  providerOrderId: string;
  providerStatus: string;
  providerStatusDetail: string | null;
  state: PaymentOrderState;
};

export type ApplyPaymentConfirmationResult = {
  kind: "applied" | "duplicate" | "unchanged";
};

export type PaymentReviewRequired = {
  orderId: string;
  providerOrderId: string;
};

export interface PaymentConfirmationRepository {
  findByProviderOrderId(
    providerOrderId: string,
  ): Promise<PaymentConfirmationTarget | null>;
  findByPublicTokenHash(
    publicTokenHash: string,
  ): Promise<PaymentConfirmationTarget | null>;
  apply(
    input: ApplyPaymentConfirmationInput,
  ): Promise<ApplyPaymentConfirmationResult>;
}
