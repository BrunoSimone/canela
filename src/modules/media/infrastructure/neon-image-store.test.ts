import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NeonImageStore, ORIGINAL_CACHE_CONTROL, WEB_CACHE_CONTROL } from "./neon-image-store";
import { sha256, type AssetFile } from "../domain/image-asset";

const config = {endpoint:"https://br-fixture.storage.c-13.us-east-1.aws.neon.tech",region:"us-east-1",accessKeyId:"test-key",
  secretAccessKey:"test-secret",originalBucket:"originals",webBucket:"web"};
const bytes = Buffer.from("synthetic"), hash = sha256(bytes);
const file:AssetFile = {key:`images/${hash}/original.png`,sha256:hash,size:bytes.length,contentType:"image/png",width:1,height:1};

function fakeStore() {
  const send = vi.fn();
  return {send,store:new NeonImageStore(config,{send,destroy:vi.fn()} as unknown as S3Client)};
}
describe("MED-151: contrato del adaptador Neon", () => {
  it("conserva originales privados y usa caché inmutable solo para derivados", async () => {
    const {send,store} = fakeStore();
    send.mockResolvedValue({});
    await store.put("original",file,bytes);
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({Bucket:"originals",CacheControl:ORIGINAL_CACHE_CONTROL,Metadata:{sha256:hash},ContentType:"image/png"});
    await store.put("web",{...file,key:`images/${hash}/web-v1-${hash}.webp`,contentType:"image/webp"},bytes);
    expect(send.mock.calls[1][0].input).toMatchObject({Bucket:"web",CacheControl:WEB_CACHE_CONTROL,ContentType:"image/webp"});
  });
  it("solo interpreta NotFound como ausencia; falla ante acceso denegado o indisponibilidad", async () => {
    const {send,store} = fakeStore();
    send.mockRejectedValueOnce(Object.assign(new Error("missing"),{name:"NotFound"}));
    expect(await store.head("original",file.key)).toBeNull();
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand);
    send.mockRejectedValueOnce(new Error("AccessDenied test-secret"));
    await expect(store.head("original",file.key)).rejects.toThrow("No pudimos consultar el almacenamiento de imágenes.");
  });
  it("descarga los bytes y rechaza respuestas sin cuerpo", async () => {
    const {send,store} = fakeStore();
    send.mockResolvedValueOnce({Body:Readable.from([bytes]),ContentLength:bytes.length});
    expect(await store.get("original",file.key)).toEqual(bytes);
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    send.mockResolvedValueOnce({});
    await expect(store.get("original",file.key)).rejects.toThrow(/recuperar/);
  });
  it("no construye direcciones públicas para originales ni rutas arbitrarias", () => {
    const {store} = fakeStore();
    expect(()=>store.publicUrl(file.key)).toThrow(/originales/);
    expect(()=>store.publicUrl("../originals/secret")).toThrow();
    expect(store.publicUrl(`images/${hash}/web-v1-${hash}.webp`)).toBe(`${config.endpoint}/web/images/${hash}/web-v1-${hash}.webp`);
  });
  it("no envía al proveedor bytes alterados", async () => {
    const {send,store} = fakeStore();
    await expect(store.put("original",file,Buffer.from("changed"))).rejects.toThrow(/no coincide/);
    expect(send).not.toHaveBeenCalled();
  });
  it("impide enviar el original al bucket público por un error del llamador", async () => {
    const {send,store} = fakeStore();
    await expect(store.put("web",file,bytes)).rejects.toThrow(/no corresponde/);
    expect(send).not.toHaveBeenCalled();
  });
});
