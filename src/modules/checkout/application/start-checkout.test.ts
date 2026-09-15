import { describe, expect, it, vi } from "vitest";

import {
  PaymentOrderGatewayError,
  type PaymentOrderGateway,
} from "../../payments/domain/payment-order";
import {
  PaymentProviderUnavailableError,
  PaymentProviderUncertainError,
  startCheckout,
} from "./start-checkout";
import type {
  CheckoutRepository,
  ReservedCheckout,
} from "../domain/checkout";

const request = {
  orderId: "d71466b7-f0e7-4434-bd72-047287217728",
  orderToken: "public-order-token",
  publicTokenHash: "a".repeat(64),
  idempotencyKey: "97683b2b-6e37-493b-ae7a-271f249ee7db",
  buyerEmail: "buyer@example.com",
  returnUrl: "https://canela.test/checkout/resultado/public-order-token",
  shippingCents: 400_000,
  items: [
    {
      productId: "sanity-product-id",
      name: "Cuadro Palmera",
      unitPriceCents: 3_000_000,
      quantity: 1,
    },
  ],
};

function reservedCheckout(
  overrides: Partial<ReservedCheckout> = {},
): ReservedCheckout {
  return {
    orderId: request.orderId,
    buyerEmail: request.buyerEmail,
    currency: "ARS",
    subtotalCents: 3_000_000,
    shippingCents: 400_000,
    totalCents: 3_400_000,
    expiresAt: new Date("2026-09-15T15:30:00.000Z"),
    providerIdempotencyKey: request.idempotencyKey,
    items: request.items,
    providerOrderId: null,
    checkoutUrl: null,
    reused: false,
    ...overrides,
  };
}

function repositoryReturning(snapshot: ReservedCheckout): CheckoutRepository {
  return {
    reserve: vi.fn().mockResolvedValue(snapshot),
    saveProviderOrder: vi.fn().mockResolvedValue(undefined),
    markProviderCreationUncertain: vi.fn().mockResolvedValue(undefined),
    releaseForDefinitiveProviderFailure: vi.fn().mockResolvedValue(undefined),
  };
}

function gatewayReturning(
  overrides: Partial<Awaited<ReturnType<PaymentOrderGateway["createOrder"]>>> = {},
): PaymentOrderGateway {
  return {
    createOrder: vi.fn().mockResolvedValue({
      providerOrderId: "ORDTST01ABC",
      externalReference: request.orderId,
      state: "created",
      providerStatus: "created",
      providerStatusDetail: null,
      totalCents: 3_400_000,
      currency: "ARS",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      ...overrides,
    }),
    getOrder: vi.fn(),
  };
}

describe("startCheckout", () => {
  it("creates the provider order from the persisted snapshot and stores it", async () => {
    const snapshot = reservedCheckout({
      items: [{ ...request.items[0], name: "Nombre congelado" }],
    });
    const repository = repositoryReturning(snapshot);
    const payments = gatewayReturning();

    const result = await startCheckout({ repository, payments }, request);

    expect(payments.createOrder).toHaveBeenCalledWith({
      idempotencyKey: request.idempotencyKey,
      externalReference: request.orderId,
      payerEmail: request.buyerEmail,
      currency: "ARS",
      totalCents: 3_400_000,
      returnUrl: request.returnUrl,
      items: [
        {
          externalCode: "sanity-product-id",
          title: "Nombre congelado",
          unitPriceCents: 3_000_000,
          quantity: 1,
        },
        {
          externalCode: "shipping",
          title: "Envío",
          unitPriceCents: 400_000,
          quantity: 1,
        },
      ],
    });
    expect(repository.saveProviderOrder).toHaveBeenCalledWith(
      request.orderId,
      expect.objectContaining({ providerOrderId: "ORDTST01ABC" }),
    );
    expect(result).toEqual({
      orderToken: request.orderToken,
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      expiresAt: snapshot.expiresAt,
      reused: false,
    });
  });

  it("returns an already persisted checkout without calling Mercado Pago again", async () => {
    const snapshot = reservedCheckout({
      providerOrderId: "ORDTST01ABC",
      checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
      reused: true,
    });
    const repository = repositoryReturning(snapshot);
    const payments = gatewayReturning();

    const result = await startCheckout({ repository, payments }, request);

    expect(payments.createOrder).not.toHaveBeenCalled();
    expect(repository.saveProviderOrder).not.toHaveBeenCalled();
    expect(result.reused).toBe(true);
    expect(result.checkoutUrl).toBe(snapshot.checkoutUrl);
  });

  it("does not call Mercado Pago when the persisted provider identity is incomplete", async () => {
    const repository = repositoryReturning(
      reservedCheckout({ providerOrderId: "ORDTST01ABC", reused: true }),
    );
    const payments = gatewayReturning();

    await expect(
      startCheckout({ repository, payments }, request),
    ).rejects.toBeInstanceOf(PaymentProviderUncertainError);

    expect(payments.createOrder).not.toHaveBeenCalled();
    expect(repository.markProviderCreationUncertain).toHaveBeenCalledWith(
      request.orderId,
    );
  });

  it("releases the reservation after a definitive provider rejection", async () => {
    const repository = repositoryReturning(reservedCheckout());
    const payments = gatewayReturning();
    vi.mocked(payments.createOrder).mockRejectedValue(
      new PaymentOrderGatewayError("definitive"),
    );

    await expect(
      startCheckout({ repository, payments }, request),
    ).rejects.toBeInstanceOf(PaymentProviderUnavailableError);
    expect(repository.releaseForDefinitiveProviderFailure).toHaveBeenCalledWith(
      request.orderId,
    );
    expect(repository.markProviderCreationUncertain).not.toHaveBeenCalled();
  });

  it.each(["retryable", "ambiguous"] as const)(
    "keeps stock reserved after a %s provider result",
    async (kind) => {
      const repository = repositoryReturning(reservedCheckout());
      const payments = gatewayReturning();
      vi.mocked(payments.createOrder).mockRejectedValue(
        new PaymentOrderGatewayError(kind),
      );

      await expect(
        startCheckout({ repository, payments }, request),
      ).rejects.toBeInstanceOf(PaymentProviderUncertainError);
      expect(repository.markProviderCreationUncertain).toHaveBeenCalledWith(
        request.orderId,
      );
      expect(repository.releaseForDefinitiveProviderFailure).not.toHaveBeenCalled();
    },
  );

  it("keeps stock reserved when the provider response does not match the order", async () => {
    const repository = repositoryReturning(reservedCheckout());
    const payments = gatewayReturning({ totalCents: 1 });

    await expect(
      startCheckout({ repository, payments }, request),
    ).rejects.toBeInstanceOf(PaymentProviderUncertainError);
    expect(repository.markProviderCreationUncertain).toHaveBeenCalledWith(
      request.orderId,
    );
    expect(repository.saveProviderOrder).not.toHaveBeenCalled();
  });

  it("keeps the reservation recoverable when persisting the provider order fails", async () => {
    const repository = repositoryReturning(reservedCheckout());
    vi.mocked(repository.saveProviderOrder).mockRejectedValue(
      new Error("database unavailable"),
    );
    const payments = gatewayReturning();

    await expect(
      startCheckout({ repository, payments }, request),
    ).rejects.toBeInstanceOf(PaymentProviderUncertainError);
    expect(repository.markProviderCreationUncertain).toHaveBeenCalledWith(
      request.orderId,
    );
    expect(repository.releaseForDefinitiveProviderFailure).not.toHaveBeenCalled();
  });
});
