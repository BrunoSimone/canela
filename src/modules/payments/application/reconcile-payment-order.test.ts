import { describe, expect, it, vi } from "vitest";

import type {
  PaymentConfirmationRepository,
  PaymentConfirmationTarget,
} from "../domain/payment-confirmation";
import type {
  PaymentOrder,
  PaymentOrderGateway,
} from "../domain/payment-order";
import { PaymentOrderGatewayError } from "../domain/payment-order";
import { reconcilePaymentOrder } from "./reconcile-payment-order";

const tokenHash = "a".repeat(64);
const target: PaymentConfirmationTarget = {
  orderId: "d71466b7-f0e7-4434-bd72-047287217728",
  providerOrderId: "ORD01M28P44G5FG8RJPM579EH56FV",
  totalCents: 3_400_000,
  currency: "ARS",
};

function paymentOrder(overrides: Partial<PaymentOrder> = {}): PaymentOrder {
  return {
    providerOrderId: target.providerOrderId,
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
  const repository = {
    findByProviderOrderId: vi.fn(),
    findByPublicTokenHash: vi.fn().mockResolvedValue(found),
    apply: vi.fn().mockResolvedValue({ kind: "applied" }),
  } satisfies PaymentConfirmationRepository;
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

describe("reconcilePaymentOrder", () => {
  it("does not consult Mercado Pago for an unknown public token", async () => {
    const deps = dependencies({ found: null });

    const result = await reconcilePaymentOrder(
      { ...deps, expectedProvider },
      tokenHash,
    );

    expect(result).toEqual({ kind: "unknown_order" });
    expect(deps.payments.getOrder).not.toHaveBeenCalled();
    expect(deps.repository.apply).not.toHaveBeenCalled();
  });

  it("applies the authoritative payment without inventing a webhook delivery", async () => {
    const deps = dependencies({});

    await reconcilePaymentOrder({ ...deps, expectedProvider }, tokenHash);

    expect(deps.repository.findByPublicTokenHash).toHaveBeenCalledWith(tokenHash);
    expect(deps.payments.getOrder).toHaveBeenCalledWith(target.providerOrderId);
    expect(deps.repository.apply).toHaveBeenCalledWith({
      webhookDeliveryId: null,
      orderId: target.orderId,
      providerOrderId: target.providerOrderId,
      providerStatus: "processed",
      providerStatusDetail: "accredited",
      state: "approved",
    });
  });

  it("uses the same provider identity checks as the webhook", async () => {
    const deps = dependencies({
      order: paymentOrder({ externalReference: "another-order" }),
    });
    const reportReviewRequired = vi.fn();

    await reconcilePaymentOrder(
      { ...deps, expectedProvider, reportReviewRequired },
      tokenHash,
    );

    expect(deps.repository.apply).toHaveBeenCalledWith(
      expect.objectContaining({ state: "review_required" }),
    );
    expect(reportReviewRequired).toHaveBeenCalledWith({
      orderId: target.orderId,
      providerOrderId: target.providerOrderId,
    });
  });

  it("preserves the reservation while Mercado Pago is processing", async () => {
    const deps = dependencies({
      order: paymentOrder({
        state: "processing",
        providerStatus: "processing",
        providerStatusDetail: "in_process",
      }),
    });

    await reconcilePaymentOrder({ ...deps, expectedProvider }, tokenHash);

    expect(deps.repository.apply).toHaveBeenCalledWith(
      expect.objectContaining({ state: "processing" }),
    );
  });

  it("does not transition the order when Mercado Pago is unavailable", async () => {
    const deps = dependencies({});
    vi.mocked(deps.payments.getOrder).mockRejectedValue(
      new PaymentOrderGatewayError("retryable"),
    );

    await expect(
      reconcilePaymentOrder({ ...deps, expectedProvider }, tokenHash),
    ).rejects.toThrow(PaymentOrderGatewayError);

    expect(deps.repository.apply).not.toHaveBeenCalled();
  });
});
