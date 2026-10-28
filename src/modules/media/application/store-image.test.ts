import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { prepareImage } from "../infrastructure/prepare-image";
import { storeImage } from "./store-image";
import { sha256, type AssetFile, type ImageObjectStore, type MediaArea, type ObjectInfo } from "../domain/image-asset";

class MemoryStore implements ImageObjectStore {
  files = new Map<string,{file:AssetFile; bytes:Buffer}>();
  puts = 0;
  failWeb = false;
  corruptRead = false;
  async head(area:MediaArea,key:string):Promise<ObjectInfo|null> {
    const value = this.files.get(`${area}/${key}`);
    return value ? {size:value.bytes.length,sha256:value.file.sha256,contentType:value.file.contentType,cacheControl:""} : null;
  }
  async put(area:MediaArea,file:AssetFile,bytes:Buffer) {
    if(area === "web" && this.failWeb) throw new Error("provider unavailable");
    this.puts++;
    this.files.set(`${area}/${file.key}`,{file,bytes:Buffer.from(bytes)});
  }
  async get(area:MediaArea,key:string) { return this.corruptRead ? Buffer.from("broken") : this.files.get(`${area}/${key}`)!.bytes; }
  publicUrl(key:string) { return `https://assets.example/web/${key}`; }
}
const fixture = async () => prepareImage(await sharp({create:{width:16,height:16,channels:4,background:"#cc8844"}}).png().toBuffer());

describe("MED-151: carga verificada y reintentos", () => {
  it("solo devuelve un asset publicable cuando ambos archivos están verificados", async () => {
    const store = new MemoryStore(), image = await fixture();
    const result = await storeImage(store,image);
    expect(store.puts).toBe(2);
    expect(result.original.sha256).toBe(sha256(await store.get("original",result.original.key)));
    expect(result.web.sha256).toBe(sha256(await store.get("web",result.web.key)));
    expect(result.publicUrl).toContain("/web/");
    expect(result.original).not.toHaveProperty("bytes");
    expect(result.web).not.toHaveProperty("bytes");
  });
  it("repetir una carga no duplica archivos", async () => {
    const store = new MemoryStore(), image = await fixture();
    const first = await storeImage(store,image);
    expect(await storeImage(store,image)).toEqual(first);
    expect(store.puts).toBe(2);
  });
  it("un fallo parcial no entrega referencia y el reintento aprovecha el original verificado", async () => {
    const store = new MemoryStore(), image = await fixture();
    store.failWeb = true;
    await expect(storeImage(store,image)).rejects.toThrow();
    expect(store.files.size).toBe(1);
    store.failWeb = false;
    await expect(storeImage(store,image)).resolves.toHaveProperty("id",image.id);
    expect(store.puts).toBe(2);
  });
  it("detecta corrupción en descarga aunque el proveedor informe el hash esperado", async () => {
    const store = new MemoryStore(), image = await fixture();
    store.corruptRead = true;
    await expect(storeImage(store,image)).rejects.toThrow(/verificar/);
  });
  it("no sobreescribe una clave existente con contenido incompatible", async () => {
    const store = new MemoryStore(), image = await fixture();
    await store.put("original",{...image.original,sha256:"incorrect"},image.original.bytes);
    await expect(storeImage(store,image)).rejects.toThrow(/verificar/);
    expect(store.puts).toBe(1);
  });
  it("rechaza un manifiesto manipulado antes de llamar al proveedor", async () => {
    const store = new MemoryStore(), image = await fixture();
    image.original.bytes = Buffer.from("changed");
    await expect(storeImage(store,image)).rejects.toThrow(/verificar/);
    expect(store.puts).toBe(0);
  });
});
