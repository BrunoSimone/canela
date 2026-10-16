import type { PaymentConfirmationTarget } from "../domain/payment-confirmation";
import type {
  PaymentOrder,
  PaymentOrderState,
} from "../domain/payment-order";

export type ExpectedPaymentProvider = {
  environment?: "test" | "production";
  sellerUserId: string;
  applicationId: string;
};

export function verifiedPaymentOrderState(
  providerOrder: PaymentOrder,
  target: PaymentConfirmationTarget,
  expectedProvider: ExpectedPaymentProvider,
): PaymentOrderState {
  const matches =
    (target.environment ?? "test") === (expectedProvider.environment ?? "test") &&
    providerOrder.providerOrderId === target.providerOrderId &&
    providerOrder.externalReference === target.orderId &&
    providerOrder.totalCents === target.totalCents &&
    providerOrder.currency === target.currency &&
    providerOrder.sellerUserId === expectedProvider.sellerUserId &&
    providerOrder.applicationId === expectedProvider.applicationId;

  return matches ? providerOrder.state : "review_required";
}
