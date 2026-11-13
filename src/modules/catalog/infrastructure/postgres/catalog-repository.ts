import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import {
  CatalogError,
  imageReferences,
  parseCatalogDocument,
  type CatalogDocument,
  type CatalogKind,
} from "../../domain/editor";
import type { StoredImage } from "@/modules/media/domain/image-asset";

export type CatalogEntry = {
  id: string;
  kind: CatalogKind;
  draft: CatalogDocument;
  published: CatalogDocument | null;
  version: number;
  archived: boolean;
  sort_key: string;
  updated_by: string;
  updated_at: Date;
};
export type PublicImage = {
  assetId: string;
  url: string;
  width: number;
  height: number;
  alt?: string;
  hotspot?: { x: number; y: number; width: number; height: number };
};
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
export function checkCatalogId(id: string) {
  if (!idPattern.test(id))
    throw new CatalogError("La referencia no es válida.", 400);
}

/** Drafts and published snapshots are separate; stock never lives inside either JSON. */
export class CatalogRepository {
  constructor(readonly sql: Sql) {}
  async list(kind: CatalogKind, search = "", page = 0, archived = false) {
    const term = search
      .trim()
      .slice(0, 100)
      .replace(/[\\%_]/g, "\\$&");
    const offset = Math.min(10000, Math.max(0, Math.floor(page))) * 25;
    const entries = await this.sql<
      CatalogEntry[]
    >`SELECT * FROM catalog_entry WHERE kind=${kind} AND archived=${archived}
    AND coalesce(draft->>'name',draft->>'title','') ILIKE ${"%" + term + "%"} ORDER BY sort_key,id LIMIT 26 OFFSET ${offset}`;
    return {
      entries: entries.slice(0, 25),
      hasNext: entries.length > 25,
      page,
    };
  }
  async get(id: string) {
    checkCatalogId(id);
    const [row] = await this.sql<
      CatalogEntry[]
    >`SELECT * FROM catalog_entry WHERE id=${id}`;
    return row ?? null;
  }
  async create(
    kind: CatalogKind,
    input: unknown,
    actor: string,
    id: string = randomUUID(),
  ): Promise<CatalogEntry> {
    checkCatalogId(id);
    const draft = parseCatalogDocument(kind, input);
    return this.sql.begin(async (tx) => {
      const [row] = await tx<
        CatalogEntry[]
      >`INSERT INTO catalog_entry(id,kind,draft,updated_by) VALUES(${id},${kind},${tx.json(draft)},${actor}) RETURNING *`;
      if (kind === "product")
        await tx`INSERT INTO catalog_stock(product_id) VALUES(${id})`;
      await this.references(tx, row);
      await this.event(tx, row, "create", actor);
      return row;
    }) as Promise<CatalogEntry>;
  }
  async change(
    id: string,
    version: number,
    action: "save" | "publish" | "unpublish" | "archive" | "restore",
    input: unknown,
    actor: string,
  ): Promise<CatalogEntry> {
    checkCatalogId(id);
    if (!Number.isSafeInteger(version) || version < 1)
      throw new CatalogError("Recargá la ficha antes de guardar.", 409);
    return this.sql.begin(async (tx) => {
      const [before] = await tx<
        CatalogEntry[]
      >`SELECT * FROM catalog_entry WHERE id=${id} FOR UPDATE`;
      if (!before) throw new CatalogError("No encontramos esta ficha.", 404);
      if (before.version !== version)
        throw new CatalogError(
          "Esta ficha cambió en otra ventana. Recargala antes de guardar.",
          409,
        );
      const draft = ["save", "publish"].includes(action)
        ? parseCatalogDocument(before.kind, input, action === "publish")
        : before.draft;
      if (action === "publish" && before.archived)
        throw new CatalogError("Restaurá la ficha antes de publicarla.");
      const published =
        action === "publish"
          ? draft
          : action === "unpublish"
            ? null
            : before.published;
      const archived =
        action === "archive"
          ? true
          : action === "restore"
            ? false
            : before.archived;
      const [row] = await tx<
        CatalogEntry[]
      >`UPDATE catalog_entry SET draft=${tx.json(draft)},published=${published ? tx.json(published) : null},archived=${archived},version=version+1,updated_by=${actor},updated_at=now() WHERE id=${id} RETURNING *`;
      await this.references(tx, row);
      await this.event(tx, row, action, actor);
      return row;
    }) as Promise<CatalogEntry>;
  }
  async duplicate(id: string, actor: string) {
    const original = await this.get(id);
    if (!original) throw new CatalogError("No encontramos esta ficha.", 404);
    const draft = { ...original.draft };
    if (draft.name) draft.name = `${draft.name.slice(0, 185)} (copia)`;
    if (draft.title) draft.title = `${draft.title.slice(0, 185)} (copia)`;
    // New product starts as an unpublished draft with zero units.
    return this.create(original.kind, draft, actor);
  }
  async reorder(
    kind: CatalogKind,
    items: { id: string; version: number }[],
    actor: string,
  ) {
    if (
      !items.length ||
      items.length > 500 ||
      new Set(items.map((i) => i.id)).size !== items.length
    )
      throw new CatalogError("Revisá el orden de las fichas.");
    items.forEach((i) => {
      checkCatalogId(i.id);
      if (!Number.isSafeInteger(i.version) || i.version < 1)
        throw new CatalogError("Recargá el listado.", 409);
    });
    await this.sql.begin(async (tx) => {
      const rows = await tx<
        CatalogEntry[]
      >`SELECT * FROM catalog_entry WHERE kind=${kind} ORDER BY id FOR UPDATE`;
      // Compare the complete observed set and versions before writing the new order.
      if (
        rows.length !== items.length ||
        items.some(
          (i) => !rows.some((r) => r.id === i.id && r.version === i.version),
        )
      )
        throw new CatalogError(
          "El listado cambió. Recargalo para ordenar.",
          409,
        );
      for (const [index, item] of items.entries()) {
        const [row] = await tx<
          CatalogEntry[]
        >`UPDATE catalog_entry SET sort_key=${String(index).padStart(8, "0")},version=version+1,updated_at=now(),updated_by=${actor} WHERE id=${item.id} RETURNING *`;
        await this.event(tx, row, "reorder", actor);
      }
    });
  }
  async move(
    id: string,
    version: number,
    direction: "up" | "down",
    actor: string,
  ) {
    const entry = await this.get(id);
    if (!entry || entry.version !== version)
      throw new CatalogError("El listado cambió. Recargalo.", 409);
    const rows = await this.sql<
      { id: string; version: number }[]
    >`SELECT id,version FROM catalog_entry WHERE kind=${entry.kind} ORDER BY sort_key,id LIMIT 501`;
    if (rows.length > 500)
      throw new CatalogError(
        "El catálogo necesita un ordenamiento paginado para esta cantidad de fichas.",
      );
    const index = rows.findIndex((r) => r.id === id),
      target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    await this.reorder(entry.kind, rows, actor);
  }
  async history(id: string) {
    checkCatalogId(id);
    return this
      .sql`SELECT version,action,actor,at FROM catalog_event WHERE entry_id=${id} ORDER BY id DESC LIMIT 30`;
  }
  async publicEntries(
    kind: CatalogKind,
    ids?: string[],
  ): Promise<CatalogEntry[]> {
    if (ids && !ids.length) return [];
    if (ids && ids.length > 100)
      throw new CatalogError("Demasiadas referencias.");
    const rows = await this.sql<
      CatalogEntry[]
    >`SELECT id,kind,published,version,sort_key FROM catalog_entry WHERE kind=${kind} AND NOT archived AND published IS NOT NULL ${ids ? this.sql`AND id IN ${this.sql(ids)}` : this.sql``} ORDER BY sort_key,id LIMIT 2001`;
    if (rows.length > 2000) throw Error("CATALOG_PAGINATION_REQUIRED");
    return rows;
  }
  async images(documents: CatalogDocument[]) {
    const ids = [
      ...new Set(
        documents.flatMap((d) => imageReferences(d).map((i) => i.assetId)),
      ),
    ];
    if (!ids.length) return new Map<string, StoredImage>();
    const rows = await this.sql<
      { id: string; manifest: StoredImage }[]
    >`SELECT id,manifest FROM media_asset WHERE id IN ${this.sql(ids)}`;
    return new Map(rows.map((r) => [r.id, r.manifest]));
  }
  private async references(tx: TransactionSql, row: CatalogEntry) {
    const ids = [
      ...new Set(
        [
          ...imageReferences(row.draft),
          ...(row.published ? imageReferences(row.published) : []),
        ].map((i) => i.assetId),
      ),
    ];
    if (ids.length) {
      const found = await tx`SELECT id FROM media_asset WHERE id IN ${tx(ids)}`;
      if (found.length !== ids.length)
        throw new CatalogError(
          "Una foto todavía no terminó de cargarse. Volvé a intentar.",
        );
    }
    await tx`DELETE FROM catalog_asset_reference WHERE entry_id=${row.id}`;
    for (const assetId of ids)
      await tx`INSERT INTO catalog_asset_reference(entry_id,asset_id) VALUES(${row.id},${assetId})`;
  }
  private event(
    tx: TransactionSql,
    row: CatalogEntry,
    action: string,
    actor: string,
  ) {
    return tx`INSERT INTO catalog_event(entry_id,version,action,actor) VALUES(${row.id},${row.version},${action},${actor})`;
  }
}
