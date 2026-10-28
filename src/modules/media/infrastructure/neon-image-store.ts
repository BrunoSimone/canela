import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sha256, type AssetFile, type ImageObjectStore, type MediaArea, type ObjectInfo } from "../domain/image-asset";
import { readMediaConfig, validateMediaKey, type MediaConfig } from "./media-config";
import { IMAGE_LIMITS } from "./prepare-image";

export const WEB_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const ORIGINAL_CACHE_CONTROL = "private, no-store";

export class NeonImageStore implements ImageObjectStore {
  private readonly client:S3Client;
  constructor(private readonly config:MediaConfig = readMediaConfig(), client?:S3Client) {
    this.client = client ?? new S3Client({endpoint:config.endpoint,region:config.region,forcePathStyle:true,
      credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},maxAttempts:3,
      requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"});
  }
  private bucket(area:MediaArea) { return area === "original" ? this.config.originalBucket : this.config.webBucket; }
  private validateArea(area:MediaArea,key:string) {
    validateMediaKey(key);
    if ((area === "original") !== /\/original\.(jpg|png|webp)$/.test(key)) {
      throw new Error("La imagen no corresponde a este almacén.");
    }
  }
  async head(area:MediaArea,key:string):Promise<ObjectInfo|null> {
    this.validateArea(area,key);
    try {
      const result = await this.client.send(new HeadObjectCommand({Bucket:this.bucket(area),Key:key}),{abortSignal:AbortSignal.timeout(15000)});
      return {size:result.ContentLength ?? -1,sha256:result.Metadata?.sha256 ?? "",contentType:result.ContentType ?? "",cacheControl:result.CacheControl ?? ""};
    } catch (error) {
      if (error instanceof Error && error.name === "NotFound") return null;
      throw new Error("No pudimos consultar el almacenamiento de imágenes.");
    }
  }
  async put(area:MediaArea,file:AssetFile,bytes:Buffer) {
    this.validateArea(area,file.key);
    if (!bytes.length || bytes.length > IMAGE_LIMITS.maxBytes || bytes.length !== file.size || sha256(bytes) !== file.sha256) {
      throw new Error("La imagen que intentamos guardar no coincide con su referencia.");
    }
    try {
      await this.client.send(new PutObjectCommand({Bucket:this.bucket(area),Key:file.key,Body:bytes,ContentLength:bytes.length,
        ContentType:file.contentType,CacheControl:area === "web" ? WEB_CACHE_CONTROL : ORIGINAL_CACHE_CONTROL,
        Metadata:{sha256:file.sha256}}),{abortSignal:AbortSignal.timeout(30000)});
    } catch { throw new Error("No pudimos guardar la imagen. Podés volver a intentar."); }
  }
  async get(area:MediaArea,key:string):Promise<Buffer> {
    this.validateArea(area,key);
    try {
      const result = await this.client.send(new GetObjectCommand({Bucket:this.bucket(area),Key:key}),{abortSignal:AbortSignal.timeout(30000)});
      if (!result.Body || (result.ContentLength ?? 0) > IMAGE_LIMITS.maxBytes) throw new Error("Invalid object size");
      const chunks:Buffer[] = []; let total = 0;
      for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
        total += chunk.length;
        if (total > IMAGE_LIMITS.maxBytes) throw new Error("Invalid object size");
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch { throw new Error("No pudimos recuperar la imagen del almacenamiento."); }
  }
  publicUrl(key:string) {
    validateMediaKey(key);
    if (!key.includes("/web-v1-")) throw new Error("Los originales no tienen una dirección pública.");
    return `${this.config.endpoint}/${this.config.webBucket}/${key}`;
  }
  async originalDownloadUrl(key:string) {
    this.validateArea("original",key);
    return getSignedUrl(this.client,new GetObjectCommand({Bucket:this.config.originalBucket,Key:key}),{expiresIn:60});
  }
  close() { this.client.destroy(); }
}
