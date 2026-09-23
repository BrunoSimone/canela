import type { PaymentConfirmationRepository } from "../domain/payment-confirmation";
import type { PaymentOrderGateway } from "../domain/payment-order";
import {
  verifiedPaymentOrderState,
  type ExpectedPaymentProvider,
} from "./verify-payment-order";

type ReconcilePaymentOrderDependencies = {
  repository: PaymentConfirmationRepository;
  payments: PaymentOrderGateway;
  expectedProvider: ExpectedPaymentProvider;
};

export type ReconcilePaymentOrderResult =
  | { kind: "unknown_order" }
  | { kind: "applied" | "duplicate" | "unchanged" };

export async function reconcilePaymentOrder(
  dependencies: ReconcilePaymentOrderDependencies,
  publicTokenHash: string,
): Promise<ReconcilePaymentOrderResult> {
  const target = await dependencies.repository.findByPublicTokenHash(
    publicTokenHash,
  );
  if (!target) {
    return { kind: "unknown_order" };
  }

  const providerOrder = await dependencies.payments.getOrder(
    target.providerOrderId,
  );
  const state = verifiedPaymentOrderState(
    providerOrder,
    target,
    dependencies.expectedProvider,
  );

  return dependencies.repository.apply({
    webhookDeliveryId: null,
    orderId: target.orderId,
    providerOrderId: target.providerOrderId,
    providerStatus: providerOrder.providerStatus,
    providerStatusDetail: providerOrder.providerStatusDetail,
    state,
  });
}
