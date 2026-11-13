import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { inventoryStore } from "@/modules/inventory/infrastructure/store";
import { readInventoryCatalog } from "@/modules/inventory/infrastructure/inventory-catalog";
import { inventoryHandlers } from "@/modules/inventory/infrastructure/inventory-handler";
import { studioIdentity, studioOrigin } from "@/modules/inventory/infrastructure/studio-auth";
export const runtime = "nodejs";
function cors(request: Request, response: Response) {
  const origin = studioOrigin(request);
  if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Vary", "Origin");
  return response;
}
export function OPTIONS(request: Request) {
  return cors(request, new Response(null, { status: studioOrigin(request) ? 204 : 403, headers: { "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Max-Age": "600" } }));
}
async function handle(request: Request, method: "get" | "post") {
  if(databaseCatalog())return cors(request,Response.json({code:"CATALOG_MOVED",message:"Gestioná productos y stock desde el panel de Canela."},{status:410,headers:{"Cache-Control":"no-store"}}));
  const handlers = inventoryHandlers({ session: () => studioIdentity(request), catalog: readInventoryCatalog, repository: inventoryStore, acceptsOrigin: r => !!studioOrigin(r) });
  return cors(request, await handlers[method](request));
}
export const GET = (request: Request) => handle(request, "get");
export const POST = (request: Request) => handle(request, "post");
