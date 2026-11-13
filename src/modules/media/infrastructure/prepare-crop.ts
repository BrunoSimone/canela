import sharp from "sharp";
import {
  sha256,
  type StoredImage,
  type ImageObjectStore,
} from "../domain/image-asset";
import { IMAGE_LIMITS } from "./prepare-image";
import type { CatalogImage } from "@/modules/catalog/domain/editor";
export const cropHash = (image: CatalogImage) =>
  sha256(
    Buffer.from(
      JSON.stringify(
        image.crop
          ? [
              image.crop.top,
              image.crop.bottom,
              image.crop.left,
              image.crop.right,
            ]
          : null,
      ),
    ),
  );
/** Bake the editorial crop once; browsers only receive a verified public derivative. */
export async function prepareCrop(
  store: ImageObjectStore,
  asset: StoredImage,
  image: CatalogImage,
): Promise<StoredImage> {
  if (!image.crop || Object.values(image.crop).every((v) => v === 0))
    return asset;
  const bytes = await store.get("original", asset.original.key);
  if (sha256(bytes) !== asset.id) throw Error("MEDIA_INTEGRITY_ERROR");
  const rotated = await sharp(bytes, {
    limitInputPixels: Math.max(
      IMAGE_LIMITS.maxPixels,
      Math.min(150_000_000, asset.original.width * asset.original.height),
    ),
  })
    .rotate()
    .timeout({ seconds: 15 })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = rotated.info,
    c = image.crop;
  const left = Math.min(width - 1, Math.floor(c.left * width)),
    top = Math.min(height - 1, Math.floor(c.top * height));
  const w = Math.max(
      1,
      Math.min(width - left, Math.round(width * (1 - c.left - c.right))),
    ),
    h = Math.max(
      1,
      Math.min(height - top, Math.round(height * (1 - c.top - c.bottom))),
    );
  const { data, info } = await sharp(rotated.data)
    .extract({ left, top, width: w, height: h })
    .resize({
      width: 2400,
      height: 2400,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toColourspace("srgb")
    .webp({ quality: 90, alphaQuality: 100, effort: 4 })
    .timeout({ seconds: 15 })
    .toBuffer({ resolveWithObject: true });
  const hash = sha256(data),
    web = {
      key: `images/${asset.id}/web-v1-${hash}.webp`,
      sha256: hash,
      size: data.length,
      contentType: "image/webp" as const,
      width: info.width,
      height: info.height,
    };
  if (!(await store.head("web", web.key))) await store.put("web", web, data);
  if (sha256(await store.get("web", web.key)) !== hash)
    throw Error("MEDIA_INTEGRITY_ERROR");
  return { ...asset, web, publicUrl: store.publicUrl(web.key) };
}
