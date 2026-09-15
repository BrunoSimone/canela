import { describe, expect, it, vi } from "vitest";

import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import type { PaymentOrderGateway } from "../../payments/domain/payment-order";
import { InvalidShippingQuoteError } from "../../shipping/domain/shipping-quote";
import type { ShippingQuoteVerifier } from "../../shipping/domain/shipping-quote";
import type { CheckoutRepository } from "../domain/checkout";
import { beginCheckout } from "./begin-checkout";

const repository: CheckoutRepository = {
  reserve: vi.fn().mockResolvedValue({
    orderId: "d71466b7-f0e7-4434-bd72-047287217728",
    buyerEmail: "buyer@example.com",
    currency: "ARS",
    subtotalCents: 1_500_000,
    shippingCents: 400_000,
    totalCents: 1_900_000,
    expiresAt: new Date("2026-09-15T16:10:00.000Z"),
    providerIdempotencyKey: "attempt-key",
    items: [
      {
        productId: "product-a",
        name: "Nombre publicado",
        unitPriceCents: 1_500_000,
        quantity: 1,
      },
    ],
    providerOrderId: "ORDTST01ABC",
    checkoutUrl: "https://www.mercadopago.com.ar/checkout/redirect",
    reused: true,
  }),
  saveProviderOrder: vi.fn(),
  markProviderCreationUncertain: vi.fn(),
  releaseForDefinitiveProviderFailure: vi.fn(),
};

const payments: PaymentOrderGateway = {
  createOrder: vi.fn(),
  getOrder: vi.fn(),
};

const catalog: ProductCatalog = {
  findByIds: vi.fn().mockResolvedValue([
    {
      id: "product-a",
      name: "Nombre publicado",
      priceArs: 15_000,
      sellable: true,
    },
  ]),
};

const quotes: ShippingQuoteVerifier = {
  verify: vi.fn().mockReturnValue({
    amountCents: 400_000,
    expiresAt: new Date("2026-09-15T16:15:00.000Z"),
    source: "controlled_test",
  }),
};

const input = {
  idempotencyKey: "attempt-key",
  buyerEmail: "buyer@example.com",
  shippingQuoteToken: "signed.quote",
  items: [{ productId: "product-a", quantity: 1 }],
};

describe("beginCheckout", () => {
  it("combines the verified quote and authoritative catalog", async () => {
    const result = await beginCheckout(
      {
        repository,
        payments,
        catalog,
        quotes,
        signingSecret: "a".repeat(64),
        siteUrl: "https://canela.test",
        createOrderId: () => "d71466b7-f0e7-4434-bd72-047287217728",
      },
      input,
    );

    expect(repository.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerEmail: "buyer@example.com",
        shippingCents: 400_000,
        items: [
          {
            productId: "product-a",
            name: "Nombre publicado",
            unitPriceCents: 1_500_000,
            quantity: 1,
          },
        ],
      }),
    );
    expect(result.checkoutUrl).toContain("mercadopago.com.ar");
  });

  it("does not query the catalog or reserve stock for an invalid quote", async () => {
    const invalidQuotes: ShippingQuoteVerifier = {
      verify: vi.fn(() => {
        throw new InvalidShippingQuoteError();
      }),
    };
    const isolatedCatalog: ProductCatalog = { findByIds: vi.fn() };
    const isolatedRepository = {
      ...repository,
      reserve: vi.fn(),
    };

    await expect(
      beginCheckout(
        {
          repository: isolatedRepository,
          payments,
          catalog: isolatedCatalog,
          quotes: invalidQuotes,
          signingSecret: "a".repeat(64),
          siteUrl: "https://canela.test",
        },
        input,
      ),
    ).rejects.toBeInstanceOf(InvalidShippingQuoteError);
    expect(isolatedCatalog.findByIds).not.toHaveBeenCalled();
    expect(isolatedRepository.reserve).not.toHaveBeenCalled();
  });
});
