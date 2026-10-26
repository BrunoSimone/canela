import { createDatabaseClient } from "@/db/client";
import { processOrderNotifications } from "@/modules/notifications/infrastructure/notification-service";
import { handleNotificationWorker } from "@/modules/notifications/presentation/http/worker-handler";
import { recoverReservationIntents } from "@/modules/inventory/infrastructure/recover-reservation-intents";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";
import { runWithWorkerDeadline } from "@/modules/notifications/application/worker-deadline";
import { readManualRecoveryStatus } from "@/modules/notifications/infrastructure/manual-recovery-status";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handleNotificationWorker(request, process.env.NOTIFICATION_WORKER_SECRET, async () => {
    if (!process.env.DATABASE_URL) throw Error("DATABASE_NOT_CONFIGURED");
    // A dedicated pool can be closed on timeout without interrupting checkout requests.
    const sql = createDatabaseClient(process.env.DATABASE_URL);
    return runWithWorkerDeadline(async signal => {
      // Bound the batch; retries retain the existing leases and idempotency keys.
      const processed = await processOrderNotifications(undefined, 1, { sql, signal });
      signal.throwIfAborted();
      await recoverReservationIntents(sql, inventoryStore(signal), 1);
      signal.throwIfAborted();
      const { review, overdue, expiredReservations } = await readManualRecoveryStatus(
        sql, process.env.PAYMENT_ENVIRONMENT === "production" ? "production" : "test",
      );
      await sql`INSERT INTO background_job_health(name,finished_at,processed,review_count,overdue_count)
        VALUES('order_notifications',now(),${processed},${review},${overdue})
        ON CONFLICT(name) DO UPDATE SET finished_at=now(),processed=EXCLUDED.processed,review_count=EXCLUDED.review_count,overdue_count=EXCLUDED.overdue_count`;
      return { processed, review, overdue, expiredReservations };
    }, () => sql.end({ timeout: 0 }));
  });
}
