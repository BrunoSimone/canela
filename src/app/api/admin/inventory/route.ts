import { getDatabase } from "@/db/client";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { readInventoryCatalog } from "@/modules/inventory/infrastructure/inventory-catalog";
import { inventoryHandlers } from "@/modules/inventory/infrastructure/inventory-handler";
import { StockRepository } from "@/modules/inventory/infrastructure/postgres/stock-repository";
export const runtime = "nodejs";
const handlers = inventoryHandlers({ session: currentAdminSession, catalog: readInventoryCatalog, repository: () => new StockRepository(getDatabase()) });
export const GET = handlers.get;
export const POST = handlers.post;
