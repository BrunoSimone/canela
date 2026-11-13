import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import sharp from "sharp";
import type { Sql } from "postgres";
import { createDatabaseClient } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { AdminUpload, type UploadStore } from "./admin-upload";
import {
  sha256,
  type AssetFile,
  type ObjectInfo,
  type MediaArea,
} from "../domain/image-asset";
import { CatalogRepository } from "@/modules/catalog/infrastructure/postgres/catalog-repository";
import { databaseProducts } from "@/modules/catalog/infrastructure/postgres/readers";
import { MediaRepository } from "../infrastructure/media-repository";
const url = process.env.TEST_DATABASE_URL;
class MemoryStore implements UploadStore {
  uploads = new Map<string, Buffer>();
  objects = new Map<string, { file: AssetFile; bytes: Buffer }>();
  reads = 0;
  removals: string[] = [];
  async uploadUrl(id: string) {
    return `https://uploads.example/${id}`;
  }
  async readUpload(id: string) {
    this.reads++;
    return this.uploads.get(id)!;
  }
  async removeUpload(id: string) {
    this.removals.push(id);
    this.uploads.delete(id);
  }
  async head(area: MediaArea, key: string): Promise<ObjectInfo | null> {
    const found = this.objects.get(`${area}/${key}`);
    return found ? { ...found.file, cacheControl: "" } : null;
  }
  async put(area: MediaArea, file: AssetFile, bytes: Buffer) {
    this.objects.set(`${area}/${file.key}`, { file, bytes });
  }
  async get(area: MediaArea, key: string) {
    return this.objects.get(`${area}/${key}`)!.bytes;
  }
  publicUrl(key: string) {
    return `https://media.example/web/${key}`;
  }
}
(url ? describe : describe.skip)(
  "CAT-154 image upload lifecycle and authorization",
  () => {
    let sql: Sql, store: MemoryStore, service: AdminUpload, bytes: Buffer;
    beforeAll(async () => {
      if (!["localhost", "127.0.0.1"].includes(new URL(url!).hostname))
        throw Error("Local disposable DB required");
      sql = createDatabaseClient(url!);
      await sql`SET client_min_messages TO warning`;
      await runMigrations(sql);
      bytes = await sharp({
        create: { width: 20, height: 30, channels: 4, background: "#b77e52" },
      })
        .png()
        .toBuffer();
    });
    beforeEach(async () => {
      await sql`TRUNCATE catalog_entry,media_upload,media_asset CASCADE`;
      store = new MemoryStore();
      service = new AdminUpload(sql, store);
    });
    afterAll(async () => {
      await sql?.end();
    });
    const input = () => ({
      hash: sha256(bytes),
      bytes: bytes.length,
      contentType: "image/png",
    });
    it("only the uploader can finish, and simultaneous retries create one verified asset without exposing originals", async () => {
      const ticket = await service.begin(input(), "owner");
      store.uploads.set(ticket.id, bytes);
      await expect(service.finish(ticket.id, "someone-else")).rejects.toThrow(
        "No encontramos",
      );
      expect(store.reads).toBe(0);
      const [a, b] = await Promise.all([
        service.finish(ticket.id, "owner"),
        service.finish(ticket.id, "owner"),
      ]);
      expect(a).toEqual(b);
      expect(store.reads).toBe(1);
      expect(Object.keys(a).sort()).toEqual([
        "assetId",
        "height",
        "url",
        "width",
      ]);
      expect(a.url).toContain("/web/");
      expect(await sql`SELECT id FROM media_asset`).toHaveLength(1);
      expect(store.removals).toEqual([]);
    });
    it("keeps a cropped photo visible after draft/publication JSONB round trips", async () => {
      const ticket = await service.begin(input(), "owner");
      store.uploads.set(ticket.id, bytes);
      const asset = await service.finish(ticket.id, "owner");
      const doc = {
        name: "Pieza",
        category: "vidrio",
        sub: "Reciclado",
        price: 100,
        images: [
          {
            assetId: asset.assetId,
            crop: { top: 0.25, bottom: 0.25, left: 0.1, right: 0.1 },
            hotspot: { x: 0.5, y: 0.5, width: 1, height: 1 },
          },
        ],
        shippingProfile: {
          weightGrams: 100,
          widthCm: 10,
          lengthCm: 10,
          heightCm: 10,
          classificationId: "6",
        },
      };
      const media = new MediaRepository(sql);
      await media.prepare(doc, store);
      const repo = new CatalogRepository(sql);
      const entry = await repo.create("product", doc, "owner");
      await repo.change(entry.id, 1, "publish", doc, "owner");
      const publicProducts = await databaseProducts(sql);
      expect(publicProducts).toHaveLength(1);
      expect(publicProducts[0].images).toHaveLength(1);
      expect(publicProducts[0].images[0]).toMatchObject({
        assetId: asset.assetId,
        width: 16,
        height: 15,
        hotspot: { x: 0.5, y: 0.5 },
      });
      expect(JSON.stringify(publicProducts)).not.toContain("original.");
    });
    it("rejects changed bytes, invalid formats and expired tickets without registering images", async () => {
      const ticket = await service.begin(input(), "owner");
      store.uploads.set(ticket.id, Buffer.from("changed"));
      await expect(service.finish(ticket.id, "owner")).rejects.toThrow(
        "no coincide",
      );
      const bad = Buffer.from('<svg onload="alert(1)"/>');
      const second = await service.begin(
        { hash: sha256(bad), bytes: bad.length, contentType: "image/png" },
        "owner",
      );
      store.uploads.set(second.id, bad);
      await expect(service.finish(second.id, "owner")).rejects.toThrow(
        "leer la imagen",
      );
      await sql`UPDATE media_upload SET expires_at=now()-interval '1 second' WHERE id=${ticket.id}`;
      await expect(service.finish(ticket.id, "owner")).rejects.toThrow(
        "venció",
      );
      expect(await sql`SELECT id FROM media_asset`).toHaveLength(0);
    });
    it("bounds pending uploads per actor even when requests race; validation happens before creating a ticket", async () => {
      await expect(
        service.begin({ ...input(), bytes: 33 * 1024 * 1024 }, "owner"),
      ).rejects.toThrow("32 MB");
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () => service.begin(input(), "owner")),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(4);
      expect(await sql`SELECT id FROM media_upload`).toHaveLength(4);
      await expect(
        service.begin(input(), "another-owner"),
      ).resolves.toHaveProperty("id");
    });
    it("cleans only expired staging objects, keeps referenced originals and can retry finalized tickets", async () => {
      const ticket = await service.begin(input(), "owner");
      store.uploads.set(ticket.id, bytes);
      const asset = await service.finish(ticket.id, "owner");
      await service.cleanup();
      expect(store.removals).toEqual([]);
      await sql`UPDATE media_upload SET expires_at=now()-interval '1 second' WHERE id=${ticket.id}`;
      await service.cleanup();
      expect(store.removals).toEqual([ticket.id]);
      expect(store.objects.size).toBe(2);
      expect(await service.finish(ticket.id, "owner")).toEqual(asset);
      await expect(service.finish(randomUUID(), "owner")).rejects.toThrow(
        "No encontramos",
      );
    });
  },
);
