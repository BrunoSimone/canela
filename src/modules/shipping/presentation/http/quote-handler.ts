import { InvalidCourierQuoteInputError, normalizeShippingDestination } from "../../domain/courier-quote";
import type { QuoteShippingInput, quoteShipping } from "../../application/quote-shipping";
import { shippingErrorResponse } from "./shipping-errors";

type Dependencies = { enabled: boolean; quote(input: QuoteShippingInput): ReturnType<typeof quoteShipping>; reportUnexpectedError?: () => void };
export async function handleShippingQuote(request: Request, deps: Dependencies): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (!deps.enabled) return Response.json({ code: "SHIPPING_DISABLED" }, { status: 404, headers });
  if (!request.headers.get("Content-Type")?.startsWith("application/json") || request.headers.get("Sec-Fetch-Site") === "cross-site") return Response.json({ code: "INVALID_SHIPPING_REQUEST" }, { status: 422, headers });
  try {
    const input = await parseRequest(request);
    const result = await deps.quote(input);
    return Response.json({ subtotalCents: result.subtotalCents, items: result.items,
      options: result.options.map(q => ({ quoteToken: q.token, shippingCents: q.amountCents, carrierName: q.carrierName,
        serviceName: q.serviceName, parcelCount: q.parcels.length, expiresAt: q.expiresAt })) }, { headers });
  } catch (error) {
    const response = shippingErrorResponse(error);
    if (response) return response;
    deps.reportUnexpectedError?.();
    return Response.json({ code: "SHIPPING_PROVIDER_UNAVAILABLE" }, { status: 503, headers });
  }
}
async function parseRequest(request: Request): Promise<QuoteShippingInput> {
  const reader = request.body?.getReader();
  if (!reader) throw new InvalidCourierQuoteInputError();
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new InvalidCourierQuoteInputError(); }
    chunks.push(value);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new InvalidCourierQuoteInputError(); }
  if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 20 ||
      body.items.some((i: { productId?: unknown; quantity?: unknown } | null) => !i || typeof i.productId !== "string" || !i.productId.trim() || i.productId.length > 200 || !Number.isSafeInteger(i.quantity) || (i.quantity as number) < 1 || (i.quantity as number) > 20)) throw new InvalidCourierQuoteInputError();
  return { destination: normalizeShippingDestination(body.destination), items: body.items.map((i: { productId: string; quantity: number }) => ({ productId: i.productId, quantity: i.quantity })) };
}
