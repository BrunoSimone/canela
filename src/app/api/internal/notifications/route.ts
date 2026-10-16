import { getDatabase } from "@/db/client";
import { processOrderNotifications } from "@/modules/notifications/infrastructure/notification-service";
import { handleNotificationWorker } from "@/modules/notifications/presentation/http/worker-handler";
export const runtime="nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handleNotificationWorker(request, process.env.NOTIFICATION_WORKER_SECRET, async () => {
    const processed = await processOrderNotifications(undefined, 5);
    const sql = getDatabase();
    const [health] = await sql`SELECT count(*) FILTER (WHERE state='review') AS review,
      count(*) FILTER (WHERE state IN ('pending','sending') AND created_at < now()-interval '1 hour') AS overdue
      FROM order_notification WHERE environment=${process.env.PAYMENT_ENVIRONMENT ?? "test"}`;
    const review = Number(health.review), overdue = Number(health.overdue);
    await sql`INSERT INTO background_job_health(name,finished_at,processed,review_count,overdue_count)
      VALUES('order_notifications',now(),${processed},${review},${overdue})
      ON CONFLICT(name) DO UPDATE SET finished_at=now(),processed=EXCLUDED.processed,review_count=EXCLUDED.review_count,overdue_count=EXCLUDED.overdue_count`;
    return { processed, review, overdue };
  });
}
