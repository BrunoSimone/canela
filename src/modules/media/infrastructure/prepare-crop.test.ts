import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { prepareCrop, cropHash } from "./prepare-crop";
import { prepareImage } from "./prepare-image";
import { storeImage } from "../application/store-image";
import type { ImageObjectStore, AssetFile } from "../domain/image-asset";
describe("CAT-154 editorial crop preserves source and transparency", () => {
  it("uses a canonical crop identity after PostgreSQL reorders JSONB keys", () => {
    const assetId = "a".repeat(64);
    expect(
      cropHash({
        assetId,
        crop: { top: 0.1, bottom: 0.2, left: 0.3, right: 0.4 },
      }),
    ).toBe(
      cropHash({
        assetId,
        crop: { left: 0.3, top: 0.1, right: 0.4, bottom: 0.2 },
      }),
    );
  });
  it("bakes a crop without overwriting the original or base derivative", async () => {
    const files = new Map<string, { file: AssetFile; bytes: Buffer }>();
    const store: ImageObjectStore = {
      head: async (_a, k) => {
        const f = files.get(k)?.file;
        return f ? { ...f, cacheControl: "" } : null;
      },
      put: async (_a, file, bytes) => {
        files.set(file.key, { file, bytes });
      },
      get: async (_a, k) => files.get(k)!.bytes,
      publicUrl: (k) => `https://images.test/${k}`,
    };
    const bytes = await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 4,
        background: { r: 200, g: 100, b: 50, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const base = await storeImage(store, await prepareImage(bytes));
    const cropped = await prepareCrop(store, base, {
      assetId: base.id,
      crop: { top: 0.25, bottom: 0.25, left: 0.1, right: 0.1 },
    });
    expect([cropped.web.width, cropped.web.height]).toEqual([80, 40]);
    expect(cropped.web.key).not.toBe(base.web.key);
    expect(cropped.original).toEqual(base.original);
    expect(files.get(base.original.key)?.bytes).toEqual(bytes);
    expect(files.has(base.web.key)).toBe(true);
    expect(
      (await sharp(files.get(cropped.web.key)!.bytes).metadata()).hasAlpha,
    ).toBe(true);
  });
});
