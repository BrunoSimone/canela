import { MediaIntegrityError, sha256, type AssetFile, type ImageObjectStore, type MediaArea, type PreparedImage, type StoredImage } from "../domain/image-asset";

function descriptor(file: AssetFile): AssetFile {
  return {key:file.key,sha256:file.sha256,size:file.size,contentType:file.contentType,width:file.width,height:file.height};
}
export async function storeImage(store: ImageObjectStore, image: PreparedImage): Promise<StoredImage> {
  for (const file of [image.original,image.web]) {
    if (file.size !== file.bytes.length || sha256(file.bytes) !== file.sha256) throw new MediaIntegrityError();
  }
  if (image.id !== image.original.sha256 ||
      !new RegExp(`^images/${image.id}/original\\.(jpg|png|webp)$`).test(image.original.key) ||
      image.web.key !== `images/${image.id}/web-v1-${image.web.sha256}.webp`) throw new MediaIntegrityError();

  async function persist(area: MediaArea, file: AssetFile & {bytes:Buffer}) {
    const existing = await store.head(area,file.key);
    if (existing && (existing.size !== file.size || existing.sha256 !== file.sha256 || existing.contentType !== file.contentType)) {
      throw new MediaIntegrityError();
    }
    if (!existing) await store.put(area,file,file.bytes);
    const stored = await store.get(area,file.key);
    if (stored.length !== file.size || sha256(stored) !== file.sha256) throw new MediaIntegrityError();
  }
  await persist("original",image.original);
  await persist("web",image.web);
  // A caller may now atomically save this manifest and its product relation.
  // Partial uploads remain unreferenced and can be retried; never delete a
  // content-addressed object here, because another product may already use it.
  return {id:image.id,original:descriptor(image.original),web:descriptor(image.web),publicUrl:store.publicUrl(image.web.key)};
}
