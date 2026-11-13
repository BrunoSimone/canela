import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import {
  parseCatalogDocument,
  imageReferences,
  type CatalogDocument,
  type CatalogKind,
  type CatalogImage,
} from "../domain/editor";
import type { StoredImage } from "@/modules/media/domain/image-asset";
export type SourceDocument = {
  _id: string;
  _type: string;
  _rev: string;
  [key: string]: unknown;
};
type Entry = {
  id: string;
  kind: CatalogKind;
  draft: CatalogDocument;
  published: CatalogDocument | null;
  sortKey: string;
  revision: string;
  stock: {
    stockOnHand: number;
    reserved: number;
    enabled: boolean;
    version: number;
  };
};
const kinds: Record<string, CatalogKind> = {
  producto: "product",
  heroSlide: "slide",
  shippingBox: "box",
  frameDesign: "frame",
};
const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function planCatalogImport(
  source: SourceDocument[],
  media: Record<string, StoredImage>,
) {
  const groups = new Map<
    string,
    { draft?: SourceDocument; published?: SourceDocument }
  >();
  for (const d of source) {
    if (!kinds[d._type]) continue;
    const id = d._id.replace(/^drafts\./, "");
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(id))
      throw Error("Invalid source document ID");
    const group = groups.get(id) ?? {};
    group[d._id.startsWith("drafts.") ? "draft" : "published"] = d;
    groups.set(id, group);
  }
  function image(input: unknown): CatalogImage | null {
    if (!input || typeof input !== "object") return null;
    const value = input as {
      asset?: { _ref?: string };
      crop?: CatalogImage["crop"];
      hotspot?: CatalogImage["hotspot"];
      alt?: string;
    };
    if (!value.asset?._ref) return null;
    const asset = media[value.asset._ref];
    if (!asset) throw Error(`Missing verified asset: ${value.asset._ref}`);
    return {
      assetId: asset.id,
      ...(value.crop
        ? {
            crop: {
              top: value.crop.top,
              bottom: value.crop.bottom,
              left: value.crop.left,
              right: value.crop.right,
            },
          }
        : {}),
      ...(value.hotspot
        ? {
            hotspot: {
              x: value.hotspot.x,
              y: value.hotspot.y,
              width: value.hotspot.width,
              height: value.hotspot.height,
            },
          }
        : {}),
      ...(value.alt ? { alt: value.alt } : {}),
    };
  }
  function document(kind: CatalogKind, s: SourceDocument) {
    return parseCatalogDocument(kind, {
      ...s,
      images: Array.isArray(s.images)
        ? s.images.flatMap((i) => {
            const mapped = image(i);
            return mapped ? [mapped] : [];
          })
        : undefined,
      image: image(s.image),
    });
  }
  const pending: { id: string; reason: string }[] = [];
  const entries: Entry[] = [...groups.entries()].map(([id, group]) => {
    const s = group.draft ?? group.published!,
      kind = kinds[s._type],
      draft = document(kind, s),
      published = group.published ? document(kind, group.published) : null;
    if (published)
      try {
        parseCatalogDocument(kind, published, true);
      } catch (e) {
        pending.push({
          id,
          reason: e instanceof Error ? e.message : "Ficha incompleta",
        });
      }
    const inventory = source.find(
      (d) => d._type === "canelaInventory" && d.productId === id,
    );
    const stock = {
      stockOnHand: Number(inventory?.stockOnHand ?? 0),
      reserved: Number(inventory?.reserved ?? 0),
      enabled: inventory ? inventory.enabled === true : true,
      version: Number(inventory?.version ?? 0),
    };
    if (
      ![stock.stockOnHand, stock.reserved, stock.version].every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000000,
      ) ||
      stock.reserved > stock.stockOnHand
    )
      throw Error(`Invalid inventory: ${id}`);
    if (stock.reserved > 0)
      throw Error(
        "Active source reservations require reconciliation before import",
      );
    return {
      id,
      kind,
      draft,
      published,
      sortKey: String(
        group.published?.orderRank ??
          group.published?.order ??
          s.orderRank ??
          s.order ??
          "",
      ),
      revision: digest({
        draft: group.draft?._rev,
        published: group.published?._rev,
        inventory: inventory?._rev,
      }),
      stock,
    };
  });
  const orphans = source.filter(
    (d) =>
      d._type === "canelaInventory" &&
      !groups.has(String(d.productId)) &&
      (Number(d.stockOnHand) > 0 || Number(d.reserved) > 0),
  );
  if (orphans.length)
    throw Error("Orphaned nonempty inventory requires reconciliation");
  if (
    source.some((d) => d._type === "canelaReservation" && d.state === "active")
  )
    throw Error(
      "Active source reservations require reconciliation before import",
    );
  return {
    entries,
    pending,
    digest: digest({
      source,
      assets: Object.values(media)
        .map((m) => ({ id: m.id, web: m.web.sha256 }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    }),
  };
}
export async function importCatalog(
  sql: Sql,
  source: SourceDocument[],
  media: Record<string, StoredImage>,
  actor: string,
) {
  const plan = planCatalogImport(source, media);
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(154000)`;
    const [prior] =
      await tx`SELECT report FROM catalog_import WHERE digest=${plan.digest}`;
    if (prior) return { ...prior.report, reused: true };
    const [active] =
      await tx`SELECT count(*)::int AS count FROM stock_reservation WHERE status='active'`;
    const [intents] =
      await tx`SELECT count(*)::int AS count FROM orders WHERE inventory_state='pending'`;
    if (active.count || intents.count)
      throw Error(
        "Pending SQL reservations require reconciliation before import",
      );
    for (const asset of Object.values(media)) {
      if (
        asset.id !== asset.original.sha256 ||
        !asset.publicUrl.endsWith("/" + asset.web.key) ||
        !asset.web.key.startsWith(`images/${asset.id}/web-v1-`)
      )
        throw Error("Invalid media manifest");
      await tx`INSERT INTO media_asset(id,manifest,created_by) VALUES(${asset.id},${tx.json(asset)},${actor}) ON CONFLICT DO NOTHING`;
    }
    let inserted = 0;
    for (const entry of plan.entries) {
      const [existing] =
        await tx`SELECT version,source_revision FROM catalog_entry WHERE id=${entry.id} FOR UPDATE`;
      if (existing) {
        if (
          existing.version !== 1 ||
          existing.source_revision !== entry.revision
        )
          throw Error("Import would overwrite a newer catalogue edit");
        continue;
      }
      await tx`INSERT INTO catalog_entry(id,kind,draft,published,source_revision,sort_key,updated_by) VALUES(${entry.id},${entry.kind},${tx.json(entry.draft)},${entry.published ? tx.json(entry.published) : null},${entry.revision},${entry.sortKey},${actor})`;
      if (entry.kind === "product")
        await tx`INSERT INTO catalog_stock(product_id,stock_on_hand,reserved,enabled,version) VALUES(${entry.id},${entry.stock.stockOnHand},${entry.stock.reserved},${entry.stock.enabled},${entry.stock.version})`;
      const ids = [
        ...new Set(
          [
            ...imageReferences(entry.draft),
            ...(entry.published ? imageReferences(entry.published) : []),
          ].map((i) => i.assetId),
        ),
      ];
      for (const assetId of ids)
        await tx`INSERT INTO catalog_asset_reference(entry_id,asset_id) VALUES(${entry.id},${assetId})`;
      await tx`INSERT INTO catalog_event(entry_id,version,action,actor) VALUES(${entry.id},1,'import',${actor})`;
      inserted++;
    }
    for (const change of source.filter(
      (d) => d._type === "canelaInventoryChange",
    )) {
      const id = change._id.replace(/^inventoryChange\./, "");
      if (
        !/^[a-f0-9-]{36}$/.test(id) ||
        !plan.entries.some((e) => e.id === change.productId)
      )
        continue;
      await tx`INSERT INTO catalog_stock_change(id,product_id,fingerprint,before_stock,after_stock,reason,actor,at) VALUES(${id},${String(change.productId)},${String(change.fingerprint)},${tx.json(change.before as never)},${tx.json(change.after as never)},${String(change.reason)},${String(change.actor)},${String(change.at)}) ON CONFLICT DO NOTHING`;
    }
    const report = {
      digest: plan.digest,
      inserted,
      entries: plan.entries.length,
      published: plan.entries.filter((e) => e.published).length,
      assets: Object.keys(media).length,
      pending: plan.pending,
      stockUnits: plan.entries.reduce((n, e) => n + e.stock.stockOnHand, 0),
    };
    await tx`INSERT INTO catalog_import(digest,report) VALUES(${plan.digest},${tx.json(report)})`;
    return { ...report, reused: false };
  });
}
