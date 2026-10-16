import { parseStockEdit, StockEditError, type InventoryProduct } from "../domain/stock-edit";
import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";
import type { StockRepository } from "./postgres/stock-repository";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });
type Dependencies = { session(): Promise<{ email: string } | null>; catalog(): Promise<InventoryProduct[]>; repository(): StockRepository };
export function inventoryHandlers(deps: Dependencies) {
  return {
    async get(request: Request) {
      if (!await deps.session()) return json({ code: "UNAUTHORIZED" }, 401);
      try {
        const products = await deps.catalog();
        const id = new URL(request.url).searchParams.get("productId");
        return json(id ? { history: await deps.repository().history(id) } : { products: products.length ? await deps.repository().list(products) : [] });
      } catch { return json({ code: "INVENTORY_UNAVAILABLE" }, 503); }
    },
    async post(request: Request) {
      const session = await deps.session();
      if (!session) return json({ code: "UNAUTHORIZED" }, 401);
      if (!isSameOriginAdminRequest(request)) return json({ code: "INVALID_ORIGIN" }, 403);
      if (new URL(request.url).searchParams.get("demo") === "1") return json({ code: "DEMO_READONLY" }, 403);
      try {
        if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new StockEditError("INVALID_STOCK_EDIT", 422);
        const reader = request.body?.getReader(); if (!reader) throw new SyntaxError();
        const chunks: Uint8Array[] = []; let size = 0;
        for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 4096) { await reader.cancel(); throw new SyntaxError(); } chunks.push(value); }
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const input = parseStockEdit(body);
        const product = (await deps.catalog()).find(p => p.id === body.productId);
        if (!product) return json({ code: "PRODUCT_NOT_FOUND" }, 404);
        return json(await deps.repository().save(product, input, session.email));
      } catch (error) {
        if (error instanceof StockEditError) return json({ code: error.code }, error.status);
        if (error instanceof SyntaxError) return json({ code: "INVALID_STOCK_EDIT" }, 422);
        return json({ code: "INVENTORY_UNAVAILABLE" }, 503);
      }
    },
  };
}
