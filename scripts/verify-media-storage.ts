import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { prepareImage } from "../src/modules/media/infrastructure/prepare-image";
import { storeImage } from "../src/modules/media/application/store-image";
import { readMediaConfig } from "../src/modules/media/infrastructure/media-config";
import { NeonImageStore, WEB_CACHE_CONTROL } from "../src/modules/media/infrastructure/neon-image-store";
import { sha256 } from "../src/modules/media/domain/image-asset";

async function main() {
  const config = readMediaConfig();
  const branch = new URL(config.endpoint).hostname.split(".")[0];
  if (process.env.CANELA_MEDIA_CONFIRM_BRANCH !== branch) {
    throw new Error("Confirmá el branch de archivos con CANELA_MEDIA_CONFIRM_BRANCH antes de escribir la fixture.");
  }
  const store = new NeonImageStore(config);
  const checks: string[] = [];
  try {
    // Synthetic, deterministic fixture: no customer photos, product data or PII.
    const source = await sharp({create:{width:128,height:96,channels:4,background:{r:180,g:110,b:60,alpha:0.5}}}).png().toBuffer();
    const prepared = await prepareImage(source,"image/png");
    const manifest = await storeImage(store,prepared);
    checks.push("authenticated_upload_and_download_sha256");
    const repeated = await storeImage(store,prepared);
    if (JSON.stringify(repeated) !== JSON.stringify(manifest)) throw new Error("El reintento cambió el manifiesto.");
    checks.push("idempotent_manifest");

    const privateResponse = await fetch(`${config.endpoint}/${config.originalBucket}/${manifest.original.key}`,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
    await privateResponse.body?.cancel();
    if (![401,403,404].includes(privateResponse.status)) throw new Error("El original no está protegido ante lectura anónima.");
    checks.push("anonymous_original_denied");

    const web = await fetch(manifest.publicUrl,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
    if (!web.ok || web.headers.get("content-type")?.split(";")[0] !== "image/webp") throw new Error("La versión pública no se puede leer como imagen.");
    if (sha256(new Uint8Array(await web.arrayBuffer())) !== manifest.web.sha256) throw new Error("Los bytes públicos no coinciden.");
    if (web.headers.get("cache-control") !== WEB_CACHE_CONTROL) throw new Error("El archivo público no conserva la política de caché.");
    checks.push("public_web_sha256_mime_and_cache");

    const signed = await store.originalDownloadUrl(manifest.original.key);
    const original = await fetch(signed,{redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000)});
    if (!original.ok) throw new Error("No se pudo descargar el original con autorización temporal.");
    const restored = Buffer.from(await original.arrayBuffer());
    if (sha256(restored) !== manifest.original.sha256) throw new Error("El original recuperado no coincide.");
    checks.push("temporary_private_download_sha256");

    await mkdir("output/media-151",{recursive:true});
    await writeFile("output/media-151/synthetic-original.png",restored);
    await writeFile("output/media-151/synthetic-web.webp",prepared.web.bytes);
    await writeFile("output/media-151/synthetic-manifest.json",JSON.stringify(manifest,null,2));
    console.log(JSON.stringify({purpose:"synthetic_media_contract_no_storefront_switch",branch,checks,originalBytes:source.length,webBytes:prepared.web.size,manifest:"output/media-151/synthetic-manifest.json"},null,2));
  } finally { store.close(); }
}
main().catch(error=>{
  // No SDK errors, signed URLs or credentials may reach logs.
  const message = error instanceof Error && !/https?:|nak_|nsk_/.test(error.message) ? error.message : "La verificación de archivos falló.";
  console.error(message);
  process.exitCode = 1;
});
