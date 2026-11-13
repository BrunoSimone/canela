import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { config, createProxy, proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

const SESSION = "a".repeat(43);
const withSession = (path: string, init: { method?: string } = {}, token = SESSION) =>
  new NextRequest(`https://canela.test${path}`, { ...init, headers: { cookie: `canela_admin_session=${token}` } });

describe("storefront maintenance", () => {
  it("blocks stock and custom-frame purchases even with production commerce flags enabled", async () => {
    const flags = { CHECKOUT_MODE: "production", PAYMENT_ENVIRONMENT: "production", COMMERCE_PRODUCTION_APPROVED: "1", SHIPPING_PROVIDER: "zipnova", ZIPNOVA_ACCOUNT_MODE: "operational", ZIPNOVA_FULFILLMENT_MODE: "production", ORDER_EMAIL_MODE: "production" };
    for (const [key, value] of Object.entries(flags)) vi.stubEnv(key, value);
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    vi.stubEnv("CUADROS_CHECKOUT_MODE", "production");
    for (const path of ["/", "/tienda", "/crear-cuadro", "/cuadros", "/checkout"]) {
      expect((await proxy(new NextRequest(`https://canela.test${path}`))).status).toBe(503);
    }
    for (const path of ["/api/checkout", "/api/shipping/quotes", "/api/cuadros/compra", "/api/cuadros/prueba", "/api/cuadros/pedido/token"]) {
      for (const method of ["GET", "POST"]) {
        const response = await proxy(new NextRequest(`https://canela.test${path}`, { method }));
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ code: "SITE_MAINTENANCE" });
        expect(response.headers.has("x-middleware-next")).toBe(false);
      }
    }
  });
  it.each(["/", "/tienda", "/checkout", "/checkout/resultado/example", "/mantenimiento", "/admin-extra", "/sitemap.xml"])("serves maintenance before rendering %s", async (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = await proxy(new NextRequest(`https://canela.test${path}?demo=1`));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://canela.test/mantenimiento");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it.each(["/api/checkout", "/api/orders/example/status", "/api/orders/example/reconcile", "/api/admin-extra", "/api/internal/notifications/extra", "/api/internal/other"])("blocks public API %s without invoking its handler", async (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = await proxy(new NextRequest(`https://canela.test${path}`, { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "SITE_MAINTENANCE" });
  });

  it("rejects form posts to public pages", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    expect((await proxy(new NextRequest("https://canela.test/checkout", { method: "POST" }))).status).toBe(503);
  });

  it.each(["/admin", "/admin/ingresar", "/admin/acceso", "/admin/pedidos/example", "/api/admin/auth/verify", "/api/admin/auth/logout", "/api/admin/orders/example/preparation", "/api/webhooks/mercado-pago", "/api/revalidate", "/api/internal/notifications", "/api/studio/inventory", "/robots.txt"])("preserves existing authentication and handlers for %s", async (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = await proxy(new NextRequest(`https://canela.test${path}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("x-middleware-rewrite")).toBe(false);
  });

  it.each(["0", ""])("restores normal routing with flag %j", async (value) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", value);
    for (const path of ["/", "/tienda", "/checkout", "/api/checkout"]) {
      expect((await proxy(new NextRequest(`https://canela.test${path}`))).headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("keeps UI assets available while matching pages and public APIs", () => {
    for (const url of ["/_next/static/chunks/app.js", "/_next/image?url=%2Fcanela-logo.png&w=96&q=75", "/canela-logo.png", "/icon.png"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
    for (const url of ["/", "/tienda", "/checkout", "/api/checkout", "/mantenimiento"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
  });
});

describe("authenticated panel preview during maintenance", () => {
  const verified = () => ({ isAdminSession: vi.fn(async (token: string) => token === SESSION) });

  it.each(["/", "/tienda", "/checkout", "/checkout/resultado/example"])("shows %s to a valid panel session without caching or indexing", async (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const deps = verified();
    const response = await createProxy(deps)(withSession(path));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("x-middleware-rewrite")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(deps.isAdminSession).toHaveBeenCalledWith(SESSION);
  });

  it("lets the preview quote shipping but never start a payment, order or frame purchase", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const run = createProxy(verified());
    expect((await run(withSession("/api/shipping/quotes", { method: "POST" }))).headers.get("x-middleware-next")).toBe("1");
    for (const [method, path] of [["POST", "/api/checkout"], ["GET", "/api/shipping/quotes"], ["GET", "/api/orders/x/status"],
      ["POST", "/api/orders/x/reconcile"], ["POST", "/api/cuadros/compra"], ["POST", "/api/cuadros/prueba"], ["POST", "/checkout"]]) {
      const response = await run(withSession(path, { method }));
      expect(response.status, `${method} ${path}`).toBe(503);
    }
  });

  it("keeps the maintenance page for invalid, expired or malformed sessions and database failures", async () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const deps = verified();
    expect((await createProxy(deps)(withSession("/tienda", {}, "b".repeat(43)))).status).toBe(503);
    expect((await createProxy(deps)(withSession("/tienda", {}, "short"))).status).toBe(503);
    expect((await createProxy(deps)(withSession("/tienda", {}, `${"a".repeat(42)}!`))).status).toBe(503);
    expect(deps.isAdminSession).toHaveBeenCalledTimes(1);
    const failing = { isAdminSession: vi.fn(async () => { throw new Error("database unavailable"); }) };
    expect((await createProxy(failing)(withSession("/tienda"))).status).toBe(503);
  });

  it("does not look up sessions for anonymous visitors, blocked APIs or when the store is open", async () => {
    const deps = verified();
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    await createProxy(deps)(new NextRequest("https://canela.test/tienda"));
    await createProxy(deps)(withSession("/api/checkout", { method: "POST" }));
    await createProxy(deps)(withSession("/mantenimiento"));
    vi.stubEnv("SITE_MAINTENANCE_MODE", "0");
    await createProxy(deps)(withSession("/tienda"));
    expect(deps.isAdminSession).not.toHaveBeenCalled();
  });
});
