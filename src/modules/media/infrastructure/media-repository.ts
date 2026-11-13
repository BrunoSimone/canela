import type { Sql } from "postgres";
import type {
  CatalogDocument,
  CatalogImage,
} from "@/modules/catalog/domain/editor";
import { imageReferences, CatalogError } from "@/modules/catalog/domain/editor";
import type { ImageObjectStore, StoredImage } from "../domain/image-asset";
import { cropHash, prepareCrop } from "./prepare-crop";
export class MediaRepository {
  constructor(readonly sql: Sql) {}
  async register(asset: StoredImage, actor: string) {
    await this
      .sql`INSERT INTO media_asset(id,manifest,created_by) VALUES(${asset.id},${this.sql.json(asset)},${actor}) ON CONFLICT(id) DO NOTHING`;
    const existing = await this.get(asset.id);
    if (!existing || existing.original.sha256 !== asset.original.sha256)
      throw Error("MEDIA_INTEGRITY_ERROR");
    return existing;
  }
  async get(id: string) {
    const [row] = await this.sql<
      { manifest: StoredImage }[]
    >`SELECT manifest FROM media_asset WHERE id=${id}`;
    return row?.manifest ?? null;
  }
  async prepare(doc: CatalogDocument, store: ImageObjectStore) {
    for (const image of imageReferences(doc)) {
      const asset = await this.get(image.assetId);
      if (!asset)
        throw new CatalogError("Una foto todavía no terminó de cargarse.");
      const hash = cropHash(image);
      const [exists] = await this
        .sql`SELECT 1 FROM media_render WHERE asset_id=${asset.id} AND crop_hash=${hash}`;
      if (exists) continue;
      const render = await prepareCrop(store, asset, image);
      await this
        .sql`INSERT INTO media_render(asset_id,crop_hash,manifest) VALUES(${asset.id},${hash},${this.sql.json(render)}) ON CONFLICT DO NOTHING`;
    }
  }
  async publicImages(docs: CatalogDocument[]) {
    const refs = docs.flatMap(imageReferences),
      ids = [...new Set(refs.map((i) => i.assetId))];
    if (!ids.length) return new Map<string, ReturnType<typeof publicImage>>();
    const rows = await this.sql<
      { asset_id: string; crop_hash: string; manifest: StoredImage }[]
    >`SELECT asset_id,crop_hash,manifest FROM media_render WHERE asset_id IN ${this.sql(ids)}`;
    const originals = await this.sql<
      { id: string; manifest: StoredImage }[]
    >`SELECT id,manifest FROM media_asset WHERE id IN ${this.sql(ids)}`;
    const renders = new Map(
      rows.map((r) => [`${r.asset_id}:${r.crop_hash}`, r.manifest]),
    );
    return new Map(
      refs.flatMap((ref) => {
        const key = renderKey(ref),
          asset =
            renders.get(key) ??
            (!ref.crop
              ? originals.find((r) => r.id === ref.assetId)?.manifest
              : undefined);
        return asset ? [[key, publicImage(asset, ref)] as const] : [];
      }),
    );
  }
}
export const renderKey = (image: CatalogImage) =>
  `${image.assetId}:${cropHash(image)}`;
export function publicImage(asset: StoredImage, reference: CatalogImage) {
  const c = reference.crop,
    h = reference.hotspot;
  const hotspot =
    h && c
      ? {
          ...h,
          x: Math.max(0, Math.min(1, (h.x - c.left) / (1 - c.left - c.right))),
          y: Math.max(0, Math.min(1, (h.y - c.top) / (1 - c.top - c.bottom))),
        }
      : h;
  return {
    assetId: asset.id,
    url: asset.publicUrl,
    width: asset.web.width,
    height: asset.web.height,
    ...(reference.alt ? { alt: reference.alt } : {}),
    ...(hotspot ? { hotspot } : {}),
  };
}
