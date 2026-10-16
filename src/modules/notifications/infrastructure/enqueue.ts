import { randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";
import type { NotificationKind } from "../domain/notification";

export async function enqueueOrderNotice(tx:TransactionSql,orderId:string,kind:NotificationKind):Promise<void>{
  await tx`INSERT INTO order_notification(id,order_id,kind,environment)
    SELECT ${randomUUID()},id,${kind},environment FROM orders WHERE id=${orderId}
    ON CONFLICT(order_id,kind) DO NOTHING`;
}
