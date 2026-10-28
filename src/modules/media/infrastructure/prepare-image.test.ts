import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { prepareImage, IMAGE_LIMITS } from "./prepare-image";
import { sha256 } from "../domain/image-asset";

const png = (width = 20, height = 12) => sharp({create:{width,height,channels:4,background:{r:185,g:120,b:90,alpha:0.5}}}).png().toBuffer();

describe("MED-151: imágenes preservadas y versión web", () => {
  it("conserva el original exacto, genera claves inmutables y no amplía imágenes pequeñas", async () => {
    const bytes = await png();
    const first = await prepareImage(bytes, "image/png");
    const second = await prepareImage(bytes, "image/png");
    expect(first.original.bytes).toEqual(bytes);
    expect(first.original.sha256).toBe(sha256(bytes));
    expect(first.id).toBe(second.id);
    expect(first.web).toEqual(second.web);
    expect(first.web.width).toBe(20);
    expect(first.web.height).toBe(12);
    expect(first.original.key).toMatch(/^images\/[a-f0-9]{64}\/original\.png$/);
    expect(first.web.key).toMatch(/^images\/[a-f0-9]{64}\/web-v1-[a-f0-9]{64}\.webp$/);
  });
  it("mantiene alfa y color de una pieza recortada", async () => {
    const result = await prepareImage(await png());
    const {data, info} = await sharp(result.web.bytes).raw().toBuffer({resolveWithObject:true});
    expect(info.channels).toBe(4);
    expect(data[0]).toBeCloseTo(185, -1);
    expect(data[1]).toBeCloseTo(120, -1);
    expect(data[2]).toBeCloseTo(90, -1);
    expect(data[3]).toBeGreaterThanOrEqual(126);
    expect(data[3]).toBeLessThanOrEqual(129);
  });
  it("aplica orientación EXIF y no publica metadatos de la cámara", async () => {
    const source = await sharp(await png(40,20)).jpeg().withMetadata({orientation:6}).toBuffer();
    const result = await prepareImage(source);
    const metadata = await sharp(result.web.bytes).metadata();
    expect([result.web.width,result.web.height]).toEqual([20,40]);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
    expect(result.original.bytes).toEqual(source);
  });
  it("reduce fotos grandes conservando proporción", async () => {
    const result = await prepareImage(await png(3200,1600));
    expect([result.web.width,result.web.height]).toEqual([2400,1200]);
  });
  it.each([Buffer.from("<svg onload='alert(1)'/>"),Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from("not an image")])("rechaza contenido falso o corrupto", async bytes => {
    await expect(prepareImage(bytes,"image/png")).rejects.toThrow();
  });
  it("rechaza el tipo declarado que no corresponde al contenido", async () => {
    await expect(prepareImage(await png(),"image/jpeg")).rejects.toThrow(/formato/);
  });
  it("rechaza archivos vacíos y demasiado grandes antes de decodificarlos", async () => {
    await expect(prepareImage(Buffer.alloc(0))).rejects.toThrow(/vacío/);
    await expect(prepareImage(Buffer.alloc(IMAGE_LIMITS.maxBytes + 1))).rejects.toThrow(/32 MB/);
  });
  it("rechaza GIF en lugar de convertir formatos no admitidos silenciosamente", async () => {
    const gif = await sharp(await png()).gif().toBuffer();
    await expect(prepareImage(gif)).rejects.toThrow(/JPG, PNG o WebP/);
  });
});
