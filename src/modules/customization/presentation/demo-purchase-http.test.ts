import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/cuadros/prueba/route";
import { demoDesignCatalog } from "../infrastructure/demo-catalog";
import { demoRecipient } from "../infrastructure/demo-purchase-config";
import { selectDesign } from "../domain/purchase";
import { createDemoPurchaseHandler } from "./demo-purchase-http";
import { demoPurchaseEnabled } from "../infrastructure/demo-purchase-availability";
const url = "http://localhost:3000/api/cuadros/prueba";
const request = (body: unknown, headers = {}) => new Request(url, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const enable = () => { vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("VERCEL_ENV", ""); vi.stubEnv("CUADROS_PREVIEW_ENABLED", "1"); };
describe("PER-132: demo HTTP boundary", () => {
  it.each(["production", "preview"])("denies %s even with the feature flag", async env => {
    enable(); vi.stubEnv("VERCEL_ENV", env);
    expect((await POST(request({ action: "pay" }))).status).toBe(404);
    expect((await GET(new Request(url))).status).toBe(404);
  });
  it("requires development even for self-hosted production", () => {
    expect(demoPurchaseEnabled({ NODE_ENV: "production", CUADROS_PREVIEW_ENABLED: "1" })).toBe(false);
    expect(demoPurchaseEnabled({ NODE_ENV: "development", CUADROS_PREVIEW_ENABLED: "0" })).toBe(false);
  });
  it("rejects foreign origins, missing origin, wrong content type and malformed input", async () => {
    enable();
    expect((await POST(request({}, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(request({}, { origin: "" }))).status).toBe(403);
    expect((await POST(request({}, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request([]))).status).toBe(400);
    expect((await POST(request({ action: "real-payment" }))).status).toBe(400);
  });
  it("handles Next loopback normalization without allowing another host or port", async () => {
    enable();
    const valid = request({}, { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" });
    expect((await POST(valid)).status).toBe(400); // reaches body validation, not a CSRF denial
    expect((await POST(request({}, { host: "evil.example", origin: "http://evil.example" }))).status).toBe(403);
    expect((await POST(request({}, { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001" }))).status).toBe(403);
    expect((await POST(request({}, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
  });
  it("bounds bodies with and without a content-length", async () => {
    enable();
    expect((await POST(request({}, { "content-length": "100001" }))).status).toBe(413);
    expect((await POST(request({ junk: "x".repeat(100001) }))).status).toBe(413);
  });
  it("never initializes dependencies on a disabled deployment", async () => {
    const service = vi.fn();
    const handler = createDemoPurchaseHandler({ enabled: () => false, recipient: demoRecipient, service });
    expect((await handler(request({}))).status).toBe(404); expect(service).not.toHaveBeenCalled();
  });
  it("runs quote → pending → approved without any network request", async () => {
    enable(); const outbound = vi.fn(() => { throw new Error("No external calls permitted"); }); vi.stubGlobal("fetch", outbound);
    const design = (await demoDesignCatalog.templates())[0].design;
    const response = await POST(request({ action: "quote", accepted: true, design: selectDesign(design), recipient: demoRecipient }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    const quote = await response.json();
    const pending = await (await POST(request({ action: "pay", quoteId: quote.id, attemptId: "http-test", outcome: "pending" }))).json();
    expect(pending.production).toBe("not_started");
    const approved = await (await POST(request({ action: "resolve", quoteId: quote.id, orderId: pending.id, outcome: "approved" }))).json();
    expect(approved.production).toBe("simulated"); expect(approved.mode).toBe("demo"); expect(outbound).not.toHaveBeenCalled();
    expect((await (await GET(new Request(url))).json()).recipient).toEqual(demoRecipient);
  });
});
