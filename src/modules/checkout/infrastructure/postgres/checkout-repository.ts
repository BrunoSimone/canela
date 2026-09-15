import type { Sql } from "postgres";

import {
  createReservedOrder,
  type CreateReservedOrderInput,
} from "../../../../db/create-reserved-order";
import type { PaymentOrder } from "../../../payments/domain/payment-order";
import type {
  CheckoutItem,
  CheckoutRepository,
  ReservedCheckout,
  ReserveCheckoutInput,
} from "../../domain/checkout";

type CheckoutRow = {
  id: string;
  buyer_email: string | null;
  currency: string;
  subtotal_cents: string;
  shipping_cents: string;
  total_cents: string;
  expires_at: Date;
  provider_idempotency_key: string | null;
  provider_order_id: string | null;
  checkout_url: string | null;
};

type CheckoutItemRow = {
  product_id: string;
  name_snapshot: string;
  unit_price_cents: string;
  quantity: number;
};

export class PostgresCheckoutRepository implements CheckoutRepository {
  constructor(private readonly sql: Sql) {}

  async reserve(input: ReserveCheckoutInput): Promise<ReservedCheckout> {
    const reserved = await createReservedOrder(
      this.sql,
      toCreateReservedOrderInput(input),
    );
    const checkout = await this.read(reserved.orderId);

    return { ...checkout, reused: reserved.reused };
  }

  async saveProviderOrder(
    orderId: string,
    providerOrder: PaymentOrder,
  ): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const result = await transaction`
        UPDATE payment_attempt
        SET
          provider_order_id = ${providerOrder.providerOrderId},
          checkout_url = ${providerOrder.checkoutUrl},
          provider_status = ${providerOrder.providerStatus},
          provider_status_detail = ${providerOrder.providerStatusDetail},
          status = 'payment_pending',
          updated_at = now()
        WHERE order_id = ${orderId}
          AND (
            provider_order_id IS NULL
            OR provider_order_id = ${providerOrder.providerOrderId}
          )
      `;

      if (result.count !== 1) {
        throw new Error("Payment attempt does not accept the provider order");
      }

      await transaction`
        UPDATE orders
        SET status = 'payment_pending', updated_at = now()
        WHERE id = ${orderId}
      `;
    });
  }

  async markProviderCreationUncertain(orderId: string): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const result = await transaction`
        UPDATE payment_attempt
        SET status = 'review_required', updated_at = now()
        WHERE order_id = ${orderId}
      `;
      if (result.count === 1) {
        await transaction`
          UPDATE orders
          SET status = 'review_required', updated_at = now()
          WHERE id = ${orderId}
        `;
      }
    });
  }

  async releaseForDefinitiveProviderFailure(orderId: string): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const [paymentAttempt] = await transaction<{
        provider_order_id: string | null;
      }[]>`
        SELECT provider_order_id
        FROM payment_attempt
        WHERE order_id = ${orderId}
        FOR UPDATE
      `;

      if (!paymentAttempt) {
        throw new Error("Payment attempt does not exist");
      }
      if (paymentAttempt.provider_order_id) {
        throw new Error("A checkout with a provider order cannot be released");
      }

      const activeReservations = await transaction<{
        product_id: string;
        quantity: number;
      }[]>`
        SELECT product_id, quantity
        FROM stock_reservation
        WHERE order_id = ${orderId}
          AND status = 'active'
        ORDER BY product_id
        FOR UPDATE
      `;

      for (const reservation of activeReservations) {
        await transaction`
          UPDATE inventory_item
          SET
            reserved = reserved - ${reservation.quantity},
            updated_at = now()
          WHERE product_id = ${reservation.product_id}
        `;
      }

      await transaction`
        UPDATE stock_reservation
        SET status = 'released', released_at = now()
        WHERE order_id = ${orderId}
          AND status = 'active'
      `;
      await transaction`
        UPDATE payment_attempt
        SET status = 'rejected', updated_at = now()
        WHERE order_id = ${orderId}
          AND provider_order_id IS NULL
      `;
      await transaction`
        UPDATE orders
        SET status = 'rejected', updated_at = now()
        WHERE id = ${orderId}
      `;
    });
  }

  private async read(orderId: string): Promise<Omit<ReservedCheckout, "reused">> {
    const [checkout] = await this.sql<CheckoutRow[]>`
      SELECT
        orders.id,
        orders.buyer_email,
        orders.currency,
        orders.subtotal_cents,
        orders.shipping_cents,
        orders.total_cents,
        min(stock_reservation.expires_at) AS expires_at,
        payment_attempt.provider_idempotency_key,
        payment_attempt.provider_order_id,
        payment_attempt.checkout_url
      FROM orders
      JOIN stock_reservation ON stock_reservation.order_id = orders.id
      JOIN payment_attempt ON payment_attempt.order_id = orders.id
      WHERE orders.id = ${orderId}
      GROUP BY orders.id, payment_attempt.id
    `;

    if (
      !checkout ||
      checkout.currency !== "ARS" ||
      !checkout.buyer_email ||
      !checkout.provider_idempotency_key
    ) {
      throw new Error("Reserved checkout is incomplete");
    }

    const items = await this.sql<CheckoutItemRow[]>`
      SELECT product_id, name_snapshot, unit_price_cents, quantity
      FROM order_item
      WHERE order_id = ${orderId}
      ORDER BY product_id
    `;

    return {
      orderId: checkout.id,
      buyerEmail: checkout.buyer_email,
      currency: "ARS",
      subtotalCents: toSafeInteger(checkout.subtotal_cents),
      shippingCents: toSafeInteger(checkout.shipping_cents),
      totalCents: toSafeInteger(checkout.total_cents),
      expiresAt: checkout.expires_at,
      providerIdempotencyKey: checkout.provider_idempotency_key,
      items: items.map(toCheckoutItem),
      providerOrderId: checkout.provider_order_id,
      checkoutUrl: checkout.checkout_url,
    };
  }
}

function toCreateReservedOrderInput(
  input: ReserveCheckoutInput,
): CreateReservedOrderInput {
  return {
    orderId: input.orderId,
    publicTokenHash: input.publicTokenHash,
    idempotencyKey: input.idempotencyKey,
    buyerEmail: input.buyerEmail,
    currency: input.currency,
    shippingCents: input.shippingCents,
    items: input.items,
  };
}

function toCheckoutItem(row: CheckoutItemRow): CheckoutItem {
  return {
    productId: row.product_id,
    name: row.name_snapshot,
    unitPriceCents: toSafeInteger(row.unit_price_cents),
    quantity: row.quantity,
  };
}

function toSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Database amount exceeds safe integer range");
  }
  return parsed;
}
