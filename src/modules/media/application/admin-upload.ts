import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";
import { sha256, type ImageObjectStore } from "../domain/image-asset";
import { prepareImage, IMAGE_LIMITS } from "../infrastructure/prepare-image";
import { storeImage } from "./store-image";
import { CatalogError } from "@/modules/catalog/domain/editor";
export interface UploadStore extends ImageObjectStore {
  uploadUrl(id: string, bytes: number, contentType: string): Promise<string>;
  readUpload(id: string, bytes: number): Promise<Buffer>;
  removeUpload(id: string): Promise<void>;
}
export function parseUpload(input: unknown) {
  const v = input as Record<string, unknown> | null;
  if (
    !v ||
    typeof v.hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(v.hash) ||
    !Number.isSafeInteger(v.bytes) ||
    Number(v.bytes) < 1 ||
    Number(v.bytes) > IMAGE_LIMITS.maxBytes ||
    typeof v.contentType !== "string" ||
    !["image/jpeg", "image/png", "image/webp"].includes(v.contentType)
  )
    throw new CatalogError("Elegí una foto JPG, PNG o WebP de hasta 32 MB.");
  return { hash: v.hash, bytes: Number(v.bytes), contentType: v.contentType };
}
export class AdminUpload {
  constructor(
    private sql: Sql,
    private store: UploadStore,
  ) {}
  async begin(input: unknown, actor: string) {
    const v = parseUpload(input);
    await this.cleanup();
    const id = randomUUID();
    await this.sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${actor},1543))`;
      const [rate] =
        await tx`SELECT count(*) FILTER(WHERE asset_id IS NULL AND expires_at>now()) AS active,count(*) AS recent FROM media_upload WHERE actor=${actor} AND created_at>now()-interval '1 hour'`;
      if (Number(rate.active) >= 4 || Number(rate.recent) >= 60)
        throw new CatalogError(
          "Terminá las cargas pendientes o volvé a intentar más tarde.",
          429,
        );
      await tx`INSERT INTO media_upload(id,actor,expected_hash,expected_bytes,content_type) VALUES(${id},${actor},${v.hash},${v.bytes},${v.contentType})`;
    });
    return { id, url: await this.store.uploadUrl(id, v.bytes, v.contentType) };
  }
  async finish(id: string, actor: string) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new CatalogError("La carga no es válida.", 400);
    // A transaction lock also makes simultaneous finalization retries harmless.
    const asset = await this.sql.begin(async (tx) => {
      const [upload] =
        await tx`SELECT * FROM media_upload WHERE id=${id} AND actor=${actor} FOR UPDATE`;
      if (!upload) throw new CatalogError("No encontramos esta carga.", 404);
      if (upload.asset_id) {
        const [row] =
          await tx`SELECT manifest FROM media_asset WHERE id=${upload.asset_id}`;
        return row.manifest;
      }
      if (new Date(upload.expires_at).getTime() <= Date.now())
        throw new CatalogError(
          "La carga venció. Seleccioná nuevamente la foto.",
          410,
        );
      const bytes = await this.store.readUpload(id, upload.expected_bytes);
      if (
        bytes.length !== upload.expected_bytes ||
        sha256(bytes) !== upload.expected_hash
      )
        throw new CatalogError(
          "La foto recibida no coincide con el archivo seleccionado.",
        );
      const stored = await storeImage(
        this.store,
        await prepareImage(bytes, upload.content_type),
      );
      await tx`INSERT INTO media_asset(id,manifest,created_by) VALUES(${stored.id},${tx.json(stored)},${actor}) ON CONFLICT DO NOTHING`;
      await tx`UPDATE media_upload SET asset_id=${stored.id} WHERE id=${id}`;
      return stored;
    });
    // Signed PUT can be replayed for 120s. Cleanup waits until the ten-minute window expires.
    return {
      assetId: asset.id,
      url: asset.publicUrl,
      width: asset.web.width,
      height: asset.web.height,
    };
  }
  async cleanup() {
    await this.sql.begin(async (tx) => {
      const expired =
        await tx`SELECT id FROM media_upload WHERE expires_at<now() AND cleaned_at IS NULL ORDER BY expires_at LIMIT 4 FOR UPDATE SKIP LOCKED`;
      for (const row of expired) {
        try {
          await this.store.removeUpload(row.id);
          await tx`UPDATE media_upload SET cleaned_at=now() WHERE id=${row.id}`;
        } catch {
          /* Retry the staging cleanup at the next authenticated upload. */
        }
      }
    });
    await this
      .sql`DELETE FROM media_upload WHERE id IN (SELECT id FROM media_upload WHERE cleaned_at IS NOT NULL AND created_at<now()-interval '7 days' ORDER BY created_at LIMIT 100)`;
  }
}
