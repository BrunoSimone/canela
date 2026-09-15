import { randomUUID } from "node:crypto";

import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import type { PaymentOrderGateway } from "../../payments/domain/payment-order";
import type { ShippingQuoteVerifier } from "../../shipping/domain/shipping-quote";
import type { CheckoutRepository } from "../domain/checkout";
import { createOrderToken, hashOrderToken } from "../infrastructure/order-token";
import {
  resolveCheckoutItems,
  type RequestedCheckoutItem,
} from "./resolve-checkout-items";
import {
  PaymentProviderUncertainError,
  startCheckout,
  type StartedCheckout,
} from "./start-checkout";

export type BeginCheckoutInput = {
  idempotencyKey: string;
  buyerEmail: string;
  shippingQuoteToken: string;
  items: RequestedCheckoutItem[];
};

type BeginCheckoutDependencies = {
  repository: CheckoutRepository;
  payments: PaymentOrderGateway;
  catalog: ProductCatalog;
  quotes: ShippingQuoteVerifier;
  signingSecret: string;
  siteUrl: string;
  createOrderId?: () => string;
};

export class CheckoutStartUncertainError extends Error {
  constructor(readonly orderToken: string, options?: ErrorOptions) {
    super("Checkout start result is uncertain", options);
    this.name = "CheckoutStartUncertainError";
  }
}

export async function beginCheckout(
  dependencies: BeginCheckoutDependencies,
  input: BeginCheckoutInput,
): Promise<StartedCheckout> {
  const quote = dependencies.quotes.verify(input.shippingQuoteToken);
  const items = await resolveCheckoutItems(dependencies.catalog, input.items);
  const orderToken = createOrderToken(
    dependencies.signingSecret,
    input.idempotencyKey,
  );
  const orderId = (dependencies.createOrderId ?? randomUUID)();
  const returnUrl = new URL(
    `/checkout/resultado/${orderToken}`,
    dependencies.siteUrl,
  ).toString();

  try {
    return await startCheckout(
      {
        repository: dependencies.repository,
        payments: dependencies.payments,
      },
      {
        orderId,
        orderToken,
        publicTokenHash: hashOrderToken(orderToken),
        idempotencyKey: input.idempotencyKey,
        buyerEmail: input.buyerEmail,
        returnUrl,
        shippingCents: quote.amountCents,
        items,
      },
    );
  } catch (error) {
    if (error instanceof PaymentProviderUncertainError) {
      throw new CheckoutStartUncertainError(orderToken, { cause: error });
    }
    throw error;
  }
}
