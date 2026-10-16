import { getDatabase } from "@/db/client";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { PostgresShipmentRepository } from "@/modules/shipping/infrastructure/postgres-shipment-repository";
import { createFulfillmentService } from "@/modules/shipping/infrastructure/server/fulfillment-service";
import { createFulfillmentHandlers } from "@/modules/shipping/presentation/http/fulfillment-handler";
export const runtime="nodejs";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
  return createFulfillmentHandlers({session:currentAdminSession,service:createFulfillmentService,
    readLabel:id=>new PostgresShipmentRepository(getDatabase()).readLabel(id)}).label((await context.params).id);
}
