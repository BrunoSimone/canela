import type { Sql, TransactionSql } from "postgres";
import type { InventoryStore } from "@/modules/inventory/domain/inventory-store";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";
import { enqueueOrderNotice } from "@/modules/notifications/infrastructure/enqueue";

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
  constructor(private readonly sql: Sql, private readonly inventory?: InventoryStore) {}

  async findByProviderOrderId(
    providerOrderId: string,
  ): Promise<PaymentConfirmationTarget | null> {
    const [row] = await this.sql<{
      order_id: string;
      provider_order_id: string;
      total_cents: string;
      currency: string;
      environment: "test" | "production";
    }[]>`
      SELECT
        orders.id AS order_id,
        payment_attempt.provider_order_id,
        orders.total_cents,
        orders.currency, orders.environment
      FROM payment_attempt
      JOIN orders ON orders.id = payment_attempt.order_id
      WHERE payment_attempt.provider = 'mercado_pago'
        AND payment_attempt.provider_order_id = ${providerOrderId}
    `;

    return mapTarget(row);
  }

  async findByPublicTokenHash(
    publicTokenHash: string,
  ): Promise<PaymentConfirmationTarget | null> {
    const [row] = await this.sql<{
      order_id: string;
      provider_order_id: string;
      total_cents: string;
      currency: string;
      environment: "test" | "production";
    }[]>`
      SELECT
        orders.id AS order_id,
        payment_attempt.provider_order_id,
        orders.total_cents,
        orders.currency, orders.environment
      FROM orders
      JOIN payment_attempt ON payment_attempt.order_id = orders.id
      WHERE orders.public_token_hash = ${publicTokenHash}
        AND payment_attempt.provider = 'mercado_pago'
        AND payment_attempt.provider_order_id IS NOT NULL
    `;

    return mapTarget(row);
  }

  async apply(
    input: ApplyPaymentConfirmationInput,
  ): Promise<ApplyPaymentConfirmationResult> {
    return this.sql.begin(async (transaction) => {
      if (input.webhookDeliveryId) {
        const inserted = await transaction`
          INSERT INTO processed_webhook (provider, event_id)
          VALUES ('mercado_pago', ${input.webhookDeliveryId})
          ON CONFLICT DO NOTHING
          RETURNING event_id
        `;
        if (inserted.count === 0) {
          return { kind: "duplicate" };
        }
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
        const [frame] = await transaction`SELECT reservation_state FROM custom_frame_order WHERE order_id=${input.orderId} FOR UPDATE`;
        if (frame) return applyFramePayment(transaction, input, frame.reservation_state);
        return applyApproved(transaction, input, this.inventory ?? inventoryStore());
      }

      if (
        input.state === "rejected" ||
        input.state === "cancelled" ||
        input.state === "expired"
      ) {
        if (FAILED_ORDER_STATES.has(current.order_status)) {
          return { kind: "unchanged" };
        }
        const [frame] = await transaction`SELECT reservation_state FROM custom_frame_order WHERE order_id=${input.orderId} FOR UPDATE`;
        if (frame) return applyFramePayment(transaction, input, frame.reservation_state);
        return applyFailure(transaction, input, this.inventory ?? inventoryStore());
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
  inventory: InventoryStore,
): Promise<ApplyPaymentConfirmationResult> {
  const reservations = await lockReservations(transaction, input.orderId);
  if (reservations.length === 0 || reservations.some(r => r.status !== "active") || !await inventory.settle(input.orderId, "consumed")) {
    await markReview(transaction, input);
    return { kind: "applied" };
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
  await enqueueOrderNotice(transaction, input.orderId, "owner_paid");
  return { kind: "applied" };
}

async function applyFailure(
  transaction: TransactionSql,
  input: ApplyPaymentConfirmationInput,
  inventory: InventoryStore,
): Promise<ApplyPaymentConfirmationResult> {
  const reservations = await lockReservations(transaction, input.orderId);
  if (reservations.some(r => r.status === "consumed") || !await inventory.settle(input.orderId, "released")) {
    await markReview(transaction, input);
    return { kind: "applied" };
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

function toSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Database amount exceeds safe integer range");
  }
  return parsed;
}

function mapTarget(
  row:
    | {
        order_id: string;
        provider_order_id: string;
        total_cents: string;
        currency: string;
        environment: "test" | "production";
      }
    | undefined,
): PaymentConfirmationTarget | null {
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
    ...(row.environment === "production" ? { environment: row.environment } : {}),
  };
}

async function applyFramePayment(tx: TransactionSql, input: ApplyPaymentConfirmationInput, reservation: string): Promise<ApplyPaymentConfirmationResult> {
  const approved=input.state==='approved';
  if (reservation!=='active') { await markReview(tx,input); return {kind:'applied'}; }
  await tx`UPDATE custom_frame_order SET reservation_state=${approved?'consumed':'released'}, production_state=${approved?'queued':'awaiting_payment'}, version=version+1, updated_at=now() WHERE order_id=${input.orderId}`;
  await tx`UPDATE orders SET status=${approved?'paid':input.state==='expired'?'expired':'rejected'}::order_status,updated_at=now() WHERE id=${input.orderId}`;
  await tx`UPDATE payment_attempt SET status=${approved?'approved':input.state}::payment_attempt_status,provider_status=${input.providerStatus},provider_status_detail=${input.providerStatusDetail},verified_at=now(),updated_at=now() WHERE order_id=${input.orderId}`;
  await tx`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${input.orderId},${approved?'payment_approved':'payment_failed'},'mercado_pago')`;
  if(approved) await enqueueOrderNotice(tx,input.orderId,'owner_paid');
  return {kind:'applied'};
}
