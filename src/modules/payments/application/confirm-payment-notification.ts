import type {
  PaymentConfirmationRepository,
  PaymentReviewRequired,
} from "../domain/payment-confirmation";
import type {
  PaymentOrderGateway,
} from "../domain/payment-order";
import {
  verifiedPaymentOrderState,
  type ExpectedPaymentProvider,
} from "./verify-payment-order";

export type PaymentNotification = {
  deliveryId: string;
  providerOrderId: string;
};

type ConfirmPaymentNotificationDependencies = {
  repository: PaymentConfirmationRepository;
  payments: PaymentOrderGateway;
  expectedProvider: ExpectedPaymentProvider;
  reportReviewRequired?(review: PaymentReviewRequired): void;
};

export type ConfirmPaymentNotificationResult =
  | { kind: "unknown_order" }
  | { kind: "applied" | "duplicate" | "unchanged" };

export async function confirmPaymentNotification(
  dependencies: ConfirmPaymentNotificationDependencies,
  notification: PaymentNotification,
): Promise<ConfirmPaymentNotificationResult> {
  const target = await dependencies.repository.findByProviderOrderId(
    notification.providerOrderId,
  );
  if (!target) {
    return { kind: "unknown_order" };
  }

  const providerOrder = await dependencies.payments.getOrder(
    notification.providerOrderId,
  );
  const state = verifiedPaymentOrderState(
    providerOrder,
    target,
    dependencies.expectedProvider,
  );

  const result = await dependencies.repository.apply({
    webhookDeliveryId: notification.deliveryId,
    orderId: target.orderId,
    providerOrderId: notification.providerOrderId,
    providerStatus: providerOrder.providerStatus,
    providerStatusDetail: providerOrder.providerStatusDetail,
    state,
  });
  if (state === "review_required" && result.kind === "applied") {
    dependencies.reportReviewRequired?.({
      orderId: target.orderId,
      providerOrderId: notification.providerOrderId,
    });
  }
  return result;
}
