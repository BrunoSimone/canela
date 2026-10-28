export type MediaConfig = {
  endpoint: string; region: string; accessKeyId: string; secretAccessKey: string;
  originalBucket: string; webBucket: string;
};
const compatibleRegions = ["us-east-1","us-east-2","eu-central-1","ap-southeast-1"];
const bucketPattern = /^[a-z][a-z0-9-]{1,61}[a-z0-9]$/;

export function readMediaConfig(env: Readonly<Record<string, string | undefined>> = process.env): MediaConfig {
  const endpoint = env.CANELA_MEDIA_ENDPOINT?.trim();
  const region = env.CANELA_MEDIA_REGION?.trim();
  const accessKeyId = env.CANELA_MEDIA_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CANELA_MEDIA_SECRET_ACCESS_KEY?.trim();
  const originalBucket = env.CANELA_MEDIA_ORIGINAL_BUCKET?.trim() || "originals";
  const webBucket = env.CANELA_MEDIA_WEB_BUCKET?.trim() || "web";
  const error = () => new Error("La configuración del almacenamiento de imágenes está incompleta o no es válida.");
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !compatibleRegions.includes(region)) throw error();
  let url:URL;
  try { url = new URL(endpoint); } catch { throw error(); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/" ||
      !new RegExp(`^br-[a-z0-9-]+\\.storage\\.c-\\d+\\.${region}\\.aws\\.neon\\.tech$`).test(url.hostname)) throw error();
  if (!bucketPattern.test(originalBucket) || !bucketPattern.test(webBucket) || originalBucket === webBucket) throw error();
  return {endpoint:url.origin,region,accessKeyId,secretAccessKey,originalBucket,webBucket};
}

export function validateMediaKey(key: string) {
  if (!/^images\/[a-f0-9]{64}\/(original\.(jpg|png|webp)|web-v1-[a-f0-9]{64}\.webp)$/.test(key)) {
    throw new Error("La referencia de la imagen no es válida.");
  }
}
