import type { Sql } from "postgres";
import type { CommerceEnvironment } from "../domain/notification";

/** Current work needing operator attention; never infer health from a scheduler timestamp. */
export async function readManualRecoveryStatus(sql: Sql, environment: CommerceEnvironment) {
  const [row] = await sql`
    SELECT
      (SELECT count(*) FROM order_notification
        WHERE environment=${environment} AND state='review') AS review,
      (SELECT count(*) FROM order_notification
        WHERE environment=${environment} AND state IN ('pending','sending')
          AND created_at < now()-interval '1 hour') AS overdue,
      (SELECT count(*) FROM orders o JOIN payment_attempt p ON p.order_id=o.id
        WHERE o.environment=${environment} AND o.inventory_state='pending'
          AND o.inventory_expires_at < now() AND p.provider_order_id IS NULL
          AND p.status IN ('preference_pending','payment_pending')) AS expired_reservations
  `;
  return {
    review: Number(row.review),
    overdue: Number(row.overdue),
    expiredReservations: Number(row.expired_reservations),
  };
}
