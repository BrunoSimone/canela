import type { Sql } from "postgres";
import type { InventoryStore } from "@/modules/inventory/domain/inventory-store";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";

import {
  ClosedCheckoutAttemptError,
  ChangedCheckoutAttemptError,
  createReservedOrder,
  InventoryUnavailableError,
  type CreateReservedOrderInput,
} from "../../../../db/create-reserved-order";
import type { PaymentOrder } from "../../../payments/domain/payment-order";
import { parseDeliverySnapshot } from "../../domain/delivery";
import {
  CheckoutAttemptClosedError,
  CheckoutAttemptChangedError,
  CheckoutInventoryUnavailableError,
  type CheckoutItem,
  type CheckoutRepository,
  type ReservedCheckout,
  type ReserveCheckoutInput,
} from "../../domain/checkout";

type CheckoutRow = {
  id: string;
  buyer_email: string | null;
  buyer_name: string;
  recipient_name: string;
  recipient_phone: string | null;
  street_name: string;
  street_number: string;
  floor: string | null;
  apartment: string | null;
  city: string;
  province_code: string;
  postal_code: string;
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
  constructor(private readonly sql: Sql, private readonly inventory: InventoryStore = inventoryStore()) {}

  async reserve(input: ReserveCheckoutInput): Promise<ReservedCheckout> {
    let reserved;
    try {
      reserved = await createReservedOrder(
        this.sql,
        toCreateReservedOrderInput(input),
        this.inventory,
      );
    } catch (error) {
      if (error instanceof InventoryUnavailableError) {
        throw new CheckoutInventoryUnavailableError(error.productIds);
      }
      if (error instanceof ClosedCheckoutAttemptError) {
        throw new CheckoutAttemptClosedError();
      }
      if (error instanceof ChangedCheckoutAttemptError) {
        throw new CheckoutAttemptChangedError();
      }
      throw error;
    }
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

      if (!await this.inventory.settle(orderId, "released")) throw Error("INVENTORY_RELEASE_CONFLICT");

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
        delivery.buyer_name,
        delivery.recipient_name,
        delivery.recipient_phone,
        delivery.street_name,
        delivery.street_number,
        delivery.floor,
        delivery.apartment,
        delivery.city,
        delivery.province_code,
        delivery.postal_code,
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
      JOIN order_delivery delivery ON delivery.order_id = orders.id
      JOIN payment_attempt ON payment_attempt.order_id = orders.id
      WHERE orders.id = ${orderId}
      GROUP BY orders.id, payment_attempt.id, delivery.order_id
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
      delivery: parseDeliverySnapshot({
        type: "home",
        buyerName: checkout.buyer_name,
        recipientName: checkout.recipient_name,
        phone: checkout.recipient_phone,
        streetName: checkout.street_name,
        streetNumber: checkout.street_number,
        floor: checkout.floor,
        apartment: checkout.apartment,
        city: checkout.city,
        provinceCode: checkout.province_code,
        postalCode: checkout.postal_code,
      }),
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
    delivery: input.delivery,
    currency: input.currency,
    shippingCents: input.shippingCents,
    ...(input.environment ? { environment: input.environment } : {}),
    ...(input.shippingSnapshot ? { shippingSnapshot: input.shippingSnapshot } : {}),
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
