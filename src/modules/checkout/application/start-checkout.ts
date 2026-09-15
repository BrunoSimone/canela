import {
  PaymentOrderGatewayError,
  type PaymentOrder,
  type PaymentOrderGateway,
  type PaymentOrderItem,
} from "../../payments/domain/payment-order";
import type {
  CheckoutItem,
  CheckoutRepository,
} from "../domain/checkout";

export type StartCheckoutInput = {
  orderId: string;
  orderToken: string;
  publicTokenHash: string;
  idempotencyKey: string;
  buyerEmail: string;
  returnUrl: string;
  shippingCents: number;
  items: CheckoutItem[];
};

export type StartedCheckout = {
  orderToken: string;
  checkoutUrl: string;
  expiresAt: Date;
  reused: boolean;
};

type StartCheckoutDependencies = {
  repository: CheckoutRepository;
  payments: PaymentOrderGateway;
};

export class PaymentProviderUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Payment provider rejected the checkout", options);
    this.name = "PaymentProviderUnavailableError";
  }
}

export class PaymentProviderUncertainError extends Error {
  constructor(options?: ErrorOptions) {
    super("Payment provider result is uncertain", options);
    this.name = "PaymentProviderUncertainError";
  }
}

export async function startCheckout(
  dependencies: StartCheckoutDependencies,
  input: StartCheckoutInput,
): Promise<StartedCheckout> {
  const checkout = await dependencies.repository.reserve({
    orderId: input.orderId,
    publicTokenHash: input.publicTokenHash,
    idempotencyKey: input.idempotencyKey,
    buyerEmail: input.buyerEmail,
    currency: "ARS",
    shippingCents: input.shippingCents,
    items: input.items,
  });

  if (checkout.providerOrderId || checkout.checkoutUrl) {
    if (checkout.providerOrderId && checkout.checkoutUrl) {
      return {
        orderToken: input.orderToken,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: checkout.expiresAt,
        reused: true,
      };
    }

    await dependencies.repository.markProviderCreationUncertain(checkout.orderId);
    throw new PaymentProviderUncertainError();
  }

  let providerOrder: PaymentOrder;
  try {
    providerOrder = await dependencies.payments.createOrder({
      idempotencyKey: checkout.providerIdempotencyKey,
      externalReference: checkout.orderId,
      payerEmail: checkout.buyerEmail,
      currency: checkout.currency,
      totalCents: checkout.totalCents,
      items: paymentItems(checkout.items, checkout.shippingCents),
      returnUrl: input.returnUrl,
    });
  } catch (error) {
    if (!(error instanceof PaymentOrderGatewayError)) {
      throw error;
    }

    if (error.kind === "definitive") {
      await dependencies.repository.releaseForDefinitiveProviderFailure(
        checkout.orderId,
      );
      throw new PaymentProviderUnavailableError({ cause: error });
    }

    await dependencies.repository.markProviderCreationUncertain(checkout.orderId);
    throw new PaymentProviderUncertainError({ cause: error });
  }

  if (!providerOrderMatchesCheckout(providerOrder, checkout)) {
    await dependencies.repository.markProviderCreationUncertain(checkout.orderId);
    throw new PaymentProviderUncertainError();
  }

  try {
    await dependencies.repository.saveProviderOrder(checkout.orderId, providerOrder);
  } catch (error) {
    await dependencies.repository.markProviderCreationUncertain(checkout.orderId);
    throw new PaymentProviderUncertainError({ cause: error });
  }

  return {
    orderToken: input.orderToken,
    checkoutUrl: providerOrder.checkoutUrl,
    expiresAt: checkout.expiresAt,
    reused: checkout.reused,
  };
}

function paymentItems(
  items: CheckoutItem[],
  shippingCents: number,
): PaymentOrderItem[] {
  const products = items.map((item) => ({
    externalCode: item.productId,
    title: item.name,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
  }));

  if (shippingCents === 0) {
    return products;
  }

  return [
    ...products,
    {
      externalCode: "shipping",
      title: "Envío",
      unitPriceCents: shippingCents,
      quantity: 1,
    },
  ];
}

function providerOrderMatchesCheckout(
  providerOrder: PaymentOrder,
  checkout: {
    orderId: string;
    totalCents: number;
    currency: "ARS";
  },
): providerOrder is PaymentOrder & { checkoutUrl: string } {
  return (
    providerOrder.externalReference === checkout.orderId &&
    providerOrder.totalCents === checkout.totalCents &&
    providerOrder.currency === checkout.currency &&
    typeof providerOrder.checkoutUrl === "string" &&
    providerOrder.checkoutUrl.length > 0
  );
}
