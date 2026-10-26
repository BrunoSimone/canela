import type { DemoPurchaseService } from "../application/demo-purchase";
import { DemoPurchaseError, type DemoRecipient } from "../domain/purchase";

const MAX_BYTES = 100_000;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex" } });
async function boundedJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > MAX_BYTES) throw new DemoPurchaseError("BODY_TOO_LARGE", "El diseño supera el tamaño permitido.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new DemoPurchaseError("INVALID_INPUT", "Faltan los datos de la prueba.");
  let total = 0; let text = ""; const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { await reader.cancel(); throw new DemoPurchaseError("BODY_TOO_LARGE", "El diseño supera el tamaño permitido.", 413); }
      text += decoder.decode(value, { stream: true });
    }
    const input: unknown = JSON.parse(text + decoder.decode());
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid body");
    return input as Record<string, unknown>;
  } catch (error) {
    if (error instanceof DemoPurchaseError) throw error;
    throw new DemoPurchaseError("INVALID_INPUT", "No pudimos leer los datos de la prueba.");
  } finally { reader.releaseLock(); }
}
function sameLocalOrigin(request: Request): boolean {
  const internal = new URL(request.url);
  const loopback = ["localhost", "127.0.0.1", "[::1]"];
  if (!loopback.includes(internal.hostname)) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;
  // Next dev normalizes the request URL to localhost; preserve the browser's
  // exact loopback Host and port, without trusting arbitrary forwarded hosts.
  const host = request.headers.get("host");
  const port = internal.port ? `:${internal.port}` : "";
  const expected = host && loopback.some(name => host === `${name}${port}`)
    ? `${internal.protocol}//${host}` : internal.origin;
  return request.headers.get("origin") === expected;
}
export function createDemoPurchaseHandler(dependencies: { enabled: () => boolean; service: () => Promise<DemoPurchaseService>; recipient: DemoRecipient }) {
  return async (request: Request): Promise<Response> => {
    if (!dependencies.enabled()) return json({ code: "NOT_AVAILABLE", error: "La compra de prueba solo está disponible en desarrollo local." }, 404);
    if (request.method === "GET") return json({ mode: "demo", recipient: dependencies.recipient });
    if (request.method !== "POST") return json({ code: "METHOD", error: "Método no permitido." }, 405);
    if (!sameLocalOrigin(request)) return json({ code: "ORIGIN", error: "Abrí la prueba desde esta tienda." }, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ code: "CONTENT_TYPE", error: "Formato no válido." }, 415);
    try {
      const body = await boundedJson(request);
      if (!["quote", "pay", "resolve"].includes(String(body.action))) throw new DemoPurchaseError("INVALID_INPUT", "Acción de prueba no válida.");
      const service = await dependencies.service();
      if (body.action === "quote") return json(service.quote(body));
      if (body.action === "pay") return json(service.pay(body));
      return json(service.resolve(body));
    } catch (error) {
      if (error instanceof DemoPurchaseError) return json({ code: error.code, error: error.message }, error.status);
      return json({ code: "UNAVAILABLE", error: "No pudimos completar la simulación. Intentá de nuevo." }, 503);
    }
  };
}
