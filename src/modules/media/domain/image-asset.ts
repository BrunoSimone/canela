import { createHash } from "node:crypto";

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export type ImageMime = "image/jpeg" | "image/png" | "image/webp";
export type AssetFile = {
  key: string; sha256: string; size: number; contentType: ImageMime;
  width: number; height: number;
};
export type PreparedImage = {
  id: string;
  original: AssetFile & { bytes: Buffer };
  web: AssetFile & { bytes: Buffer };
};
export type StoredImage = {
  id: string; original: AssetFile; web: AssetFile; publicUrl: string;
};
export type MediaArea = "original" | "web";
export type ObjectInfo = { size: number; sha256: string; contentType: string; cacheControl: string };
export interface ImageObjectStore {
  head(area: MediaArea, key: string): Promise<ObjectInfo | null>;
  put(area: MediaArea, file: AssetFile, bytes: Buffer): Promise<void>;
  get(area: MediaArea, key: string): Promise<Buffer>;
  publicUrl(key: string): string;
}
export class MediaIntegrityError extends Error {
  constructor() { super("No pudimos verificar la imagen guardada. Volvé a intentar la carga."); }
}
