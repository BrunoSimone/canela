import sharp from "sharp";
import { sha256, type ImageMime, type PreparedImage } from "../domain/image-asset";

export const IMAGE_LIMITS = { maxBytes: 32 * 1024 * 1024, maxPixels: 50_000_000, webSide: 2400 } as const;
const formats = { jpeg: { mime: "image/jpeg", extension: "jpg" }, png: { mime: "image/png", extension: "png" }, webp: { mime: "image/webp", extension: "webp" } } as const;

/** Admin-side ingestion. The buyer's creator still processes its photos locally. */
export async function prepareImage(bytes: Buffer, declaredType?: string): Promise<PreparedImage> {
  if (!bytes.length) throw new Error("El archivo está vacío.");
  if (bytes.length > IMAGE_LIMITS.maxBytes) throw new Error("La imagen puede pesar hasta 32 MB.");
  try {
    const input = sharp(bytes, { limitInputPixels: IMAGE_LIMITS.maxPixels, failOn: "warning" });
    const metadata = await input.metadata();
    if (!metadata.format || !(metadata.format in formats) || (metadata.pages ?? 1) !== 1) {
      throw new Error("Elegí una imagen estática JPG, PNG o WebP.");
    }
    const format = formats[metadata.format as keyof typeof formats];
    if (declaredType && declaredType !== "application/octet-stream" && declaredType !== format.mime) {
      throw new Error("El formato del archivo no coincide con la imagen.");
    }
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > IMAGE_LIMITS.maxPixels) {
      throw new Error("La imagen supera el límite de 50 megapíxeles.");
    }
    // Keep the original separately. Public derivatives have no camera/GPS EXIF.
    const {data, info} = await input.rotate()
      .resize({width:IMAGE_LIMITS.webSide,height:IMAGE_LIMITS.webSide,fit:"inside",withoutEnlargement:true})
      .toColourspace("srgb").webp({quality:90,alphaQuality:100,effort:4})
      .timeout({seconds:15}).toBuffer({resolveWithObject:true});
    const id = sha256(bytes), webHash = sha256(data);
    return {
      id,
      original: {key:`images/${id}/original.${format.extension}`,sha256:id,size:bytes.length,
        contentType:format.mime as ImageMime,width:metadata.width,height:metadata.height,bytes},
      web: {key:`images/${id}/web-v1-${webHash}.webp`,sha256:webHash,size:data.length,
        contentType:"image/webp",width:info.width,height:info.height,bytes:data},
    };
  } catch (error) {
    if (error instanceof Error && /^(Elegí|El formato|La imagen)/.test(error.message)) throw error;
    throw new Error("No pudimos leer la imagen. Revisá que sea un JPG, PNG o WebP válido de hasta 50 megapíxeles.");
  }
}
