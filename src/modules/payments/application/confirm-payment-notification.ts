import type {
  PaymentConfirmationRepository,
  PaymentConfirmationTarget,
} from "../domain/payment-confirmation";
import type {
  PaymentOrder,
  PaymentOrderGateway,
} from "../domain/payment-order";

export type PaymentNotification = {
  deliveryId: string;
  providerOrderId: string;
};

type ExpectedPaymentProvider = {
  sellerUserId: string;
  applicationId: string;
};

type ConfirmPaymentNotificationDependencies = {
  repository: PaymentConfirmationRepository;
  payments: PaymentOrderGateway;
  expectedProvider: ExpectedPaymentProvider;
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
  const state = matchesTarget(
    providerOrder,
    target,
    dependencies.expectedProvider,
  )
    ? providerOrder.state
    : "review_required";

  return dependencies.repository.apply({
    deliveryId: notification.deliveryId,
    orderId: target.orderId,
    providerOrderId: notification.providerOrderId,
    providerStatus: providerOrder.providerStatus,
    providerStatusDetail: providerOrder.providerStatusDetail,
    state,
  });
}

function matchesTarget(
  providerOrder: PaymentOrder,
  target: PaymentConfirmationTarget,
  expected: ExpectedPaymentProvider,
): boolean {
  return (
    providerOrder.providerOrderId === target.providerOrderId &&
    providerOrder.externalReference === target.orderId &&
    providerOrder.totalCents === target.totalCents &&
    providerOrder.currency === target.currency &&
    providerOrder.sellerUserId === expected.sellerUserId &&
    providerOrder.applicationId === expected.applicationId
  );
}
