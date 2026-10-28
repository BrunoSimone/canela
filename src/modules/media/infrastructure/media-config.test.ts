import { describe, expect, it } from "vitest";
import { readMediaConfig, validateMediaKey } from "./media-config";
const valid = {CANELA_MEDIA_ENDPOINT:"https://br-fixture.storage.c-13.us-east-1.aws.neon.tech",CANELA_MEDIA_REGION:"us-east-1",
  CANELA_MEDIA_ACCESS_KEY_ID:"test-key",CANELA_MEDIA_SECRET_ACCESS_KEY:"test-secret"};
describe("MED-151: credenciales y referencias del almacén", () => {
  it("separa los buckets y usa únicamente las variables del proyecto de medios", () => {
    expect(readMediaConfig({...valid,DATABASE_URL:"postgres://unrelated"})).toMatchObject({originalBucket:"originals",webBucket:"web",region:"us-east-1"});
  });
  it.each(["http://127.0.0.1","https://evil.example","https://br-fixture.storage.c-13.us-east-1.aws.neon.tech.evil.example",
    "https://user:secret@br-fixture.storage.c-13.us-east-1.aws.neon.tech","https://br-fixture.storage.c-13.us-east-1.aws.neon.tech/?secret=x"])
  ("rechaza endpoints inesperados o credenciales en URL: %s", endpoint => {
    expect(()=>readMediaConfig({...valid,CANELA_MEDIA_ENDPOINT:endpoint})).toThrow(/configuración/);
  });
  it("no admite buckets compartidos entre originales y versiones públicas", () => {
    expect(()=>readMediaConfig({...valid,CANELA_MEDIA_ORIGINAL_BUCKET:"same",CANELA_MEDIA_WEB_BUCKET:"same"})).toThrow();
  });
  it("no imprime secretos en errores de configuración", () => {
    try { readMediaConfig({...valid,CANELA_MEDIA_REGION:"sa-east-1"}); } catch(error) {
      expect(String(error)).not.toContain("test-secret");
    }
  });
  it.each(["../originals/private.png","/absolute","images/invalid/original.png","https://evil.example/secret","images/%2e%2e/key"])("rechaza claves fuera del contrato: %s",key=> {
    expect(()=>validateMediaKey(key)).toThrow();
  });
});
