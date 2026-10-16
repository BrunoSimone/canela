import { getDatabase } from "@/db/client";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { PostgresDispatchRepository } from "@/modules/shipping/infrastructure/postgres-dispatch-repository";
import { fulfillmentEnabled } from "@/modules/shipping/infrastructure/server/fulfillment-service";
import { readShippingConfig } from "@/modules/shipping/infrastructure/server/shipping-config";
import { operationsHandlers } from "../presentation/http/operations-handler";
import { readOrderMailConfig } from "./mail-config";
import { processOrderNotifications } from "./notification-service";
import { PostgresNotificationRepository } from "./postgres-notification-repository";
export function adminOperations(){return operationsHandlers({
 session:currentAdminSession,enabled:fulfillmentEnabled,mailEnabled:()=>!!readOrderMailConfig(),
 dispatch:(id,remote,actor)=>new PostgresDispatchRepository(getDatabase(),readShippingConfig()).confirm(id,remote,actor),
 process:processOrderNotifications,summary:id=>new PostgresNotificationRepository(getDatabase()).summary(id),
});}
