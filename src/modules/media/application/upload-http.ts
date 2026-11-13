import { privateJson } from "@/modules/admin/infrastructure/admin-request";
import { isSameOriginAdminRequest } from "@/modules/admin/infrastructure/admin-origin";
import { readBoundedText } from "@/lib/http/read-bounded-body";
import { CatalogError } from "@/modules/catalog/domain/editor";
import type { AdminUpload } from "./admin-upload";
type Deps = {
  session(): Promise<{ email: string } | null>;
  enabled(): boolean;
  service(): AdminUpload;
  origin?: (r: Request) => boolean;
};
export function uploadHandler(d: Deps) {
  return async (r: Request) => {
    const s = await d.session();
    if (!s) return privateJson({ error: "Ingresá al panel." }, 401);
    if (!d.enabled())
      return privateJson({ error: "El catálogo aún no está activo." }, 503);
    if (
      !(d.origin ?? isSameOriginAdminRequest)(r) ||
      new URL(r.url).searchParams.get("demo") === "1"
    )
      return privateJson({ error: "Origen no permitido." }, 403);
    try {
      if (!r.headers.get("content-type")?.startsWith("application/json"))
        throw new CatalogError("Formato no válido.", 415);
      const b = JSON.parse(await readBoundedText(r, 2048));
      if (!b || typeof b !== "object")
        throw new CatalogError("Solicitud no válida.");
      if (b.action === "begin")
        return privateJson(await d.service().begin(b, s.email));
      if (b.action === "finish" && typeof b.id === "string")
        return privateJson(await d.service().finish(b.id, s.email));
      throw new CatalogError("Solicitud no válida.");
    } catch (e) {
      return privateJson(
        {
          error:
            e instanceof CatalogError
              ? e.message
              : "No pudimos subir la foto. Revisá el archivo y volvé a intentar.",
        },
        e instanceof CatalogError ? e.status : 503,
      );
    }
  };
}
