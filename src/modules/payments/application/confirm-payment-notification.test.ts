import { describe, expect, it, vi } from "vitest";

import type {
  PaymentConfirmationRepository,
  PaymentConfirmationTarget,
} from "../domain/payment-confirmation";
import type {
  PaymentOrder,
  PaymentOrderGateway,
} from "../domain/payment-order";
import { confirmPaymentNotification } from "./confirm-payment-notification";

const notification = {
  deliveryId: "2066ca19-c6f1-498a-be75-1923005edd06",
  providerOrderId: "ORD01M28P44G5FG8RJPM579EH56FV",
};

const target: PaymentConfirmationTarget = {
  orderId: "d71466b7-f0e7-4434-bd72-047287217728",
  providerOrderId: notification.providerOrderId,
  totalCents: 3_400_000,
  currency: "ARS",
};

function paymentOrder(overrides: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    providerOrderId: notification.providerOrderId,
    externalReference: target.orderId,
    state: "approved",
    providerStatus: "processed",
    providerStatusDetail: "accredited",
    totalCents: target.totalCents,
    currency: "ARS",
    checkoutUrl: null,
    sellerUserId: "seller-123",
    applicationId: "app-456",
    ...overrides,
  };
}

function dependencies(options: {
  found?: PaymentConfirmationTarget | null;
  order?: PaymentOrder;
}) {
  const found = "found" in options ? options.found : target;
  const repository: PaymentConfirmationRepository = {
    findByProviderOrderId: vi.fn().mockResolvedValue(found),
    apply: vi.fn().mockResolvedValue({ kind: "applied" }),
  };
  const payments: PaymentOrderGateway = {
    createOrder: vi.fn(),
    getOrder: vi.fn().mockResolvedValue(options.order ?? paymentOrder()),
  };

  return { repository, payments };
}

const expectedProvider = {
  sellerUserId: "seller-123",
  applicationId: "app-456",
};

describe("confirmPaymentNotification", () => {
  it("ignores a signed notification for an order that does not belong to Canela", async () => {
    const deps = dependencies({ found: null });

    const result = await confirmPaymentNotification(
      { ...deps, expectedProvider },
      notification,
    );

    expect(result).toEqual({ kind: "unknown_order" });
    expect(deps.payments.getOrder).not.toHaveBeenCalled();
    expect(deps.repository.apply).not.toHaveBeenCalled();
  });

  it("uses GET order as authority and applies an approved payment", async () => {
    const deps = dependencies({});

    await confirmPaymentNotification(
      { ...deps, expectedProvider },
      notification,
    );

    expect(deps.payments.getOrder).toHaveBeenCalledWith(
      notification.providerOrderId,
    );
    expect(deps.repository.apply).toHaveBeenCalledWith({
      deliveryId: notification.deliveryId,
      orderId: target.orderId,
      providerOrderId: notification.providerOrderId,
      providerStatus: "processed",
      providerStatusDetail: "accredited",
      state: "approved",
    });
  });

  it.each([
    ["reference", { externalReference: "another-order" }],
    ["amount", { totalCents: 1 }],
    ["currency", { currency: "BRL" }],
    ["provider order", { providerOrderId: "another-provider-order" }],
    ["seller", { sellerUserId: "another-seller" }],
    ["application", { applicationId: "another-app" }],
  ] as const)(
    "marks the order for review when the authoritative %s does not match",
    async (_field, overrides) => {
      const deps = dependencies({ order: paymentOrder(overrides) });

      await confirmPaymentNotification(
        { ...deps, expectedProvider },
        notification,
      );

      expect(deps.repository.apply).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: target.orderId,
          state: "review_required",
        }),
      );
    },
  );

  it.each([
    ["created", "created"],
    ["action_required", "action_required"],
    ["processing", "processing"],
    ["rejected", "rejected"],
    ["cancelled", "cancelled"],
    ["expired", "expired"],
  ] as const)("passes the verified %s state to persistence", async (_name, state) => {
    const deps = dependencies({ order: paymentOrder({ state }) });

    await confirmPaymentNotification(
      { ...deps, expectedProvider },
      notification,
    );

    expect(deps.repository.apply).toHaveBeenCalledWith(
      expect.objectContaining({ state }),
    );
  });
});
