import {
  catalogKinds,
  CatalogError,
  parseCatalogDocument,
  imageReferences,
  imageReferenceKey,
  type CatalogKind,
} from "../domain/editor";
import { readBoundedText } from "@/lib/http/read-bounded-body";
import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";
import { privateJson } from "@/modules/admin/infrastructure/admin-request";
import type { CatalogRepository } from "../infrastructure/postgres/catalog-repository";
import { renderKey } from "@/modules/media/infrastructure/media-repository";
import type { MediaRepository } from "@/modules/media/infrastructure/media-repository";
import type { InventoryStore } from "@/modules/inventory/domain/inventory-store";
import {
  StockEditError,
  parseStockEdit,
} from "@/modules/inventory/domain/stock-edit";
type Deps = {
  session(): Promise<{ email: string } | null>;
  enabled(): boolean;
  repository(): CatalogRepository;
  media(): MediaRepository;
  inventory(): InventoryStore;
  prepare(doc: ReturnType<typeof parseCatalogDocument>): Promise<void>;
  origin?: (r: Request) => boolean;
};
export function catalogHandlers(d: Deps) {
  async function allowed(r: Request, mutation = false) {
    const s = await d.session();
    if (!s)
      return privateJson({ error: "Ingresá al panel para continuar." }, 401);
    if (!d.enabled())
      return privateJson(
        { error: "La migración del catálogo todavía no está activa." },
        503,
      );
    if (mutation && !(d.origin ?? isSameOriginAdminRequest)(r))
      return privateJson({ error: "Origen no permitido." }, 403);
    if (new URL(r.url).searchParams.get("demo") === "1")
      return privateJson({ error: "Esta vista es de consulta." }, 403);
    return s;
  }
  function fail(e: unknown) {
    if (e instanceof CatalogError)
      return privateJson({ error: e.message }, e.status);
    if (e instanceof StockEditError)
      return privateJson({ error: stockMessage(e.code) }, e.status);
    if (e instanceof SyntaxError)
      return privateJson({ error: "Revisá los datos enviados." }, 422);
    return privateJson(
      {
        error:
          "No pudimos completar la operación. Tus cambios siguen en la pantalla.",
      },
      503,
    );
  }
  async function previews(docs: ReturnType<typeof parseCatalogDocument>[]) {
    const images = await d.media().publicImages(docs);
    return Object.fromEntries(
      docs.flatMap(imageReferences).flatMap((ref) => {
        const image = images.get(renderKey(ref));
        return image ? [[imageReferenceKey(ref), image]] : [];
      }),
    );
  }
  return {
    async get(r: Request) {
      const s = await allowed(r);
      if (s instanceof Response) return s;
      try {
        const p = new URL(r.url).searchParams,
          id = p.get("id"),
          repo = d.repository();
        if (id) {
          const entry = await repo.get(id);
          if (!entry)
            return privateJson({ error: "No encontramos esta ficha." }, 404);
          const stock =
            entry.kind === "product"
              ? (
                  await d
                    .inventory()
                    .list([
                      {
                        id,
                        name: entry.draft.name ?? "",
                        price: entry.draft.price ?? 0,
                      },
                    ])
                )[0]
              : null;
          return privateJson({
            entry,
            stock,
            images: await previews([entry.draft]),
            history: await repo.history(id),
            stockHistory:
              entry.kind === "product" ? await d.inventory().history(id) : [],
          });
        }
        const kind = p.get("kind") ?? "product";
        if (!catalogKinds.includes(kind as CatalogKind))
          throw new CatalogError("Sección desconocida.", 400);
        const page = Number(p.get("page") ?? 0);
        if (!Number.isSafeInteger(page) || page < 0 || page > 10000)
          throw new CatalogError("Página no válida.", 400);
        const result = await repo.list(
          kind as CatalogKind,
          p.get("q") ?? "",
          page,
          p.get("archived") === "1",
        );
        const stocks =
          kind === "product"
            ? await d
                .inventory()
                .list(
                  result.entries.map((e) => ({
                    id: e.id,
                    name: e.draft.name ?? "",
                    price: e.draft.price ?? 0,
                  })),
                )
            : [];
        return privateJson({
          ...result,
          stocks,
          images: await previews(result.entries.map((e) => e.draft)),
        });
      } catch (e) {
        return fail(e);
      }
    },
    async post(r: Request) {
      const s = await allowed(r, true);
      if (s instanceof Response) return s;
      try {
        if (!r.headers.get("content-type")?.startsWith("application/json"))
          throw new CatalogError("Formato no válido.", 415);
        const b = JSON.parse(await readBoundedText(r, 245000));
        if (!b || typeof b !== "object" || Array.isArray(b))
          throw new CatalogError("Solicitud no válida.");
        const repo = d.repository();
        if (b.action === "create") {
          if (!catalogKinds.includes(b.kind))
            throw new CatalogError("Sección desconocida.");
          const doc = parseCatalogDocument(b.kind, b.document);
          await d.prepare(doc);
          return privateJson(
            { entry: await repo.create(b.kind, doc, s.email) },
            201,
          );
        }
        if (typeof b.id !== "string") throw new CatalogError("Falta la ficha.");
        if (b.action === "move") {
          if (!["up", "down"].includes(b.direction))
            throw new CatalogError("Dirección no válida.");
          await repo.move(b.id, b.version, b.direction, s.email);
          return privateJson({ ok: true });
        }
        if (b.action === "duplicate")
          return privateJson(
            { entry: await repo.duplicate(b.id, s.email) },
            201,
          );
        if (b.action === "stock") {
          const e = await repo.get(b.id);
          if (!e || e.kind !== "product")
            throw new CatalogError("No encontramos el producto.", 404);
          return privateJson({
            stock: await d
              .inventory()
              .save(
                {
                  id: e.id,
                  name: e.draft.name ?? "",
                  price: e.draft.price ?? 0,
                },
                parseStockEdit(b.stock),
                s.email,
              ),
          });
        }
        if (
          !["save", "publish", "unpublish", "archive", "restore"].includes(
            b.action,
          )
        )
          throw new CatalogError("Acción desconocida.");
        if (["save", "publish"].includes(b.action)) {
          const e = await repo.get(b.id);
          if (!e) throw new CatalogError("No encontramos la ficha.", 404);
          const doc = parseCatalogDocument(
            e.kind,
            b.document,
            b.action === "publish",
          );
          await d.prepare(doc);
          b.document = doc;
        }
        return privateJson({
          entry: await repo.change(
            b.id,
            b.version,
            b.action,
            b.document,
            s.email,
          ),
        });
      } catch (e) {
        return fail(e);
      }
    },
  };
}
function stockMessage(code: string) {
  return (
    (
      {
        STOCK_CHANGED:
          "El stock cambió con otro movimiento. Recargá la ficha para actualizarlo.",
        STOCK_BELOW_RESERVED:
          "La cantidad no puede ser menor que las unidades reservadas.",
        STOCK_RETRY_CONFLICT: "Esta operación ya se guardó con otros datos.",
        INVALID_STOCK_EDIT:
          "Ingresá una cantidad entera y el motivo del ajuste.",
      } as Record<string, string>
    )[code] ?? "No pudimos actualizar el stock."
  );
}
