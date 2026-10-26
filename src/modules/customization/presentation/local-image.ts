import type { Raster } from "../domain/design";

export type LocalImage = { url: string; raster: Raster };
export async function validateImageFile(file: File): Promise<void> {
  if (!file.size) throw new Error("El archivo está vacío. Elegí otra imagen.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera los 10 MB. Elegí una versión más liviana.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = [82, 73, 70, 70].every((v, i) => bytes[i] === v) && [87, 69, 66, 80].every((v, i) => bytes[i + 8] === v);
  if (!(png && file.type === "image/png" || jpeg && file.type === "image/jpeg" || webp && file.type === "image/webp")) {
    throw new Error("Ese formato no es compatible. Usá una imagen JPG, PNG o WebP.");
  }
}

export async function loadLocalImage(file: File): Promise<LocalImage> {
  await validateImageFile(file);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { throw new Error("No pudimos abrir esa imagen. Probá con otro archivo JPG, PNG o WebP."); }
  try {
    if (bitmap.width * bitmap.height > 24_000_000) throw new Error("La imagen supera los 24 megapíxeles. Reducí su resolución e intentá de nuevo.");
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen. Probá en un navegador actualizado.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("No pudimos preparar la imagen. Intentá con otro archivo.")), "image/png"));
    return { url: URL.createObjectURL(blob), raster: { width: pixels.width, height: pixels.height, data: pixels.data } };
  } finally { bitmap.close(); }
}
