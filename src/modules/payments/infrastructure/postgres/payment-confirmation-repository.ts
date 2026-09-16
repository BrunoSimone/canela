import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";

import type {
  ApplyPaymentConfirmationInput,
  ApplyPaymentConfirmationResult,
  PaymentConfirmationRepository,
  PaymentConfirmationTarget,
} from "../../domain/payment-confirmation";

type OrderRow = {
  order_status: string;
  payment_status: string;
};

type ReservationRow = {
  product_id: string;
  quantity: number;
  status: string;
};

type InventoryRow = {
  product_id: string;
  stock_on_hand: number;
  reserved: number;
};

const PAID_ORDER_STATES = new Set([
  "paid",
  "fulfillment_pending",
  "shipped",
  "delivered",
  "refund_pending",
  "refunded",
]);
const FAILED_ORDER_STATES = new Set(["rejected", "expired"]);

export class PostgresPaymentConfirmationRepository
  implements PaymentConfirmationRepository
{
  constructor(private readonly sql: Sql) {}

  async findByProviderOrderId(
    providerOrderId: string,
  ): Promise<PaymentConfirmationTarget | null> {
    const [row] = await this.sql<{
      order_id: string;
      provider_order_id: string;
      total_cents: string;
      currency: string;
    }[]>`
      SELECT
        orders.id AS order_id,
        payment_attempt.provider_order_id,
        orders.total_cents,
        orders.currency
      FROM payment_attempt
      JOIN orders ON orders.id = payment_attempt.order_id
      WHERE payment_attempt.provider = 'mercado_pago'
        AND payment_attempt.provider_order_id = ${providerOrderId}
    `;

    if (!row) {
      return null;
    }
    if (row.currency !== "ARS") {
      throw new Error("Payment confirmation target has an invalid currency");
    }

    return {
      orderId: row.order_id,
      providerOrderId: row.provider_order_id,
      totalCents: toSafeInteger(row.total_cents),
      currency: "ARS",
    };
  }

  async apply(
    input: ApplyPaymentConfirmationInput,
  ): Promise<ApplyPaymentConfirmationResult> {
    return this.sql.begin(async (transaction) => {
      const inserted = await transaction`
        INSERT INTO processed_webhook (provider, event_id)
        VALUES ('mercado_pago', ${input.deliveryId})
        ON CONFLICT DO NOTHING
        RETURNING event_id
      `;
      if (inserted.count === 0) {
        return { kind: "duplicate" };
      }

      const [current] = await transaction<OrderRow[]>`
        SELECT
          orders.status AS order_status,
          payment_attempt.status AS payment_status
        FROM orders
        JOIN payment_attempt ON payment_attempt.order_id = orders.id
        WHERE orders.id = ${input.orderId}
          AND payment_attempt.provider = 'mercado_pago'
          AND payment_attempt.provider_order_id = ${input.providerOrderId}
        FOR UPDATE OF orders, payment_attempt
      `;
      if (!current) {
        throw new Error("Payment confirmation target changed");
      }

      if (PAID_ORDER_STATES.has(current.order_status)) {
        return { kind: "unchanged" };
      }

      if (input.state === "approved") {
        if (FAILED_ORDER_STATES.has(current.order_status)) {
          await markReview(transaction, input);
          return { kind: "applied" };
        }
        return applyApproved(transaction, input);
      }

      if (
        input.state === "rejected" ||
        input.state === "cancelled" ||
        input.state === "expired"
      ) {
        if (FAILED_ORDER_STATES.has(current.order_status)) {
          return { kind: "unchanged" };
        }
        return applyFailure(transaction, input);
      }

      if (input.state === "review_required") {
        if (
          current.order_status === "review_required" &&
          current.payment_status === "review_required"
        ) {
          await updateProviderAudit(transaction, input);
          return { kind: "unchanged" };
        }
        await markReview(transaction, input);
        return { kind: "applied" };
      }

      if (FAILED_ORDER_STATES.has(current.order_status)) {
        await markReview(transaction, input);
        return { kind: "applied" };
      }

      await transaction`
        UPDATE orders
        SET status = 'payment_pending', updated_at = now()
        WHERE id = ${input.orderId}
          AND status <> 'review_required'
      `;
      await transaction`
        UPDATE payment_attempt
        SET
          status = CASE
            WHEN status = 'review_required' THEN status
            ELSE 'payment_pending'::payment_attempt_status
          END,
          provider_status = ${input.providerStatus},
          provider_status_detail = ${input.providerStatusDetail},
          verified_at = now(),
          updated_at = now()
        WHERE order_id = ${input.orderId}
      `;
      return { kind: "applied" };
    });
  }
}

async function applyApproved(
  transaction: TransactionSql,
  input: ApplyPaymentConfirmationInput,
): Promise<ApplyPaymentConfirmationResult> {
  const reservations = await lockReservations(transaction, input.orderId);
  const inventory = await lockInventory(transaction, reservations);

  if (
    reservations.length === 0 ||
    reservations.some((reservation) => reservation.status !== "active") ||
    !canApplyInventory(reservations, inventory)
  ) {
    await markReview(transaction, input);
    return { kind: "applied" };
  }

  for (const reservation of reservations) {
    await transaction`
      UPDATE inventory_item
      SET
        stock_on_hand = stock_on_hand - ${reservation.quantity},
        reserved = reserved - ${reservation.quantity},
        updated_at = now()
      WHERE product_id = ${reservation.product_id}
    `;
    await transaction`
      INSERT INTO inventory_adjustment (id, product_id, delta, reason, actor)
      VALUES (
        ${randomUUID()},
        ${reservation.product_id},
        ${-reservation.quantity},
        'payment_confirmed',
        ${`mercado_pago:${input.orderId}`}
      )
    `;
  }

  await transaction`
    UPDATE stock_reservation
    SET status = 'consumed', consumed_at = now()
    WHERE order_id = ${input.orderId} AND status = 'active'
  `;
  await transaction`
    UPDATE orders
    SET status = 'paid', updated_at = now()
    WHERE id = ${input.orderId}
  `;
  await transaction`
    UPDATE payment_attempt
    SET
      status = 'approved',
      provider_status = ${input.providerStatus},
      provider_status_detail = ${input.providerStatusDetail},
      verified_at = now(),
      updated_at = now()
    WHERE order_id = ${input.orderId}
  `;
  return { kind: "applied" };
}

async function applyFailure(
  transaction: TransactionSql,
  input: ApplyPaymentConfirmationInput,
): Promise<ApplyPaymentConfirmationResult> {
  const reservations = await lockReservations(transaction, input.orderId);
  const inventory = await lockInventory(transaction, reservations);

  if (
    reservations.some((reservation) => reservation.status === "consumed") ||
    !canReleaseInventory(reservations, inventory)
  ) {
    await markReview(transaction, input);
    return { kind: "applied" };
  }

  for (const reservation of reservations) {
    if (reservation.status !== "active") {
      continue;
    }
    await transaction`
      UPDATE inventory_item
      SET reserved = reserved - ${reservation.quantity}, updated_at = now()
      WHERE product_id = ${reservation.product_id}
    `;
  }

  await transaction`
    UPDATE stock_reservation
    SET status = 'released', released_at = now()
    WHERE order_id = ${input.orderId} AND status = 'active'
  `;
  const orderStatus = input.state === "expired" ? "expired" : "rejected";
  await transaction`
    UPDATE orders
    SET status = ${orderStatus}::order_status, updated_at = now()
    WHERE id = ${input.orderId}
  `;
  await transaction`
    UPDATE payment_attempt
    SET
      status = ${input.state}::payment_attempt_status,
      provider_status = ${input.providerStatus},
      provider_status_detail = ${input.providerStatusDetail},
      verified_at = now(),
      updated_at = now()
    WHERE order_id = ${input.orderId}
  `;
  return { kind: "applied" };
}

async function markReview(
  transaction: TransactionSql,
  input: ApplyPaymentConfirmationInput,
): Promise<void> {
  await transaction`
    UPDATE orders
    SET status = 'review_required', updated_at = now()
    WHERE id = ${input.orderId}
  `;
  await transaction`
    UPDATE payment_attempt
    SET
      status = 'review_required',
      provider_status = ${input.providerStatus},
      provider_status_detail = ${input.providerStatusDetail},
      verified_at = now(),
      updated_at = now()
    WHERE order_id = ${input.orderId}
  `;
}

async function updateProviderAudit(
  transaction: TransactionSql,
  input: ApplyPaymentConfirmationInput,
): Promise<void> {
  await transaction`
    UPDATE payment_attempt
    SET
      provider_status = ${input.providerStatus},
      provider_status_detail = ${input.providerStatusDetail},
      verified_at = now(),
      updated_at = now()
    WHERE order_id = ${input.orderId}
  `;
}

async function lockReservations(
  transaction: TransactionSql,
  orderId: string,
): Promise<ReservationRow[]> {
  return transaction<ReservationRow[]>`
    SELECT product_id, quantity, status
    FROM stock_reservation
    WHERE order_id = ${orderId}
    ORDER BY product_id
    FOR UPDATE
  `;
}

async function lockInventory(
  transaction: TransactionSql,
  reservations: ReservationRow[],
): Promise<Map<string, InventoryRow>> {
  const rows: InventoryRow[] = [];
  for (const reservation of reservations) {
    const [inventory] = await transaction<InventoryRow[]>`
      SELECT product_id, stock_on_hand, reserved
      FROM inventory_item
      WHERE product_id = ${reservation.product_id}
      FOR UPDATE
    `;
    if (inventory) {
      rows.push(inventory);
    }
  }
  return new Map(rows.map((row) => [row.product_id, row]));
}

function canApplyInventory(
  reservations: ReservationRow[],
  inventory: Map<string, InventoryRow>,
): boolean {
  return reservations.every((reservation) => {
    const item = inventory.get(reservation.product_id);
    return (
      item !== undefined &&
      item.stock_on_hand >= reservation.quantity &&
      item.reserved >= reservation.quantity
    );
  });
}

function canReleaseInventory(
  reservations: ReservationRow[],
  inventory: Map<string, InventoryRow>,
): boolean {
  return reservations.every((reservation) => {
    if (reservation.status !== "active") {
      return true;
    }
    const item = inventory.get(reservation.product_id);
    return item !== undefined && item.reserved >= reservation.quantity;
  });
}

function toSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Database amount exceeds safe integer range");
  }
  return parsed;
}
