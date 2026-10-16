import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

import { config, proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("storefront maintenance", () => {
  it.each(["/", "/checkout", "/checkout/resultado/example", "/mantenimiento", "/admin-extra", "/sitemap.xml"])("serves maintenance before rendering %s", (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = proxy(new NextRequest(`https://canela.test${path}?demo=1`));
    expect(response.status).toBe(503);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://canela.test/mantenimiento");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("retry-after")).toBe("3600");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it.each(["/api/checkout", "/api/orders/example/status", "/api/orders/example/reconcile", "/api/admin-extra", "/api/internal/notifications/extra", "/api/internal/other"])("blocks public API %s without invoking its handler", async (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = proxy(new NextRequest(`https://canela.test${path}`, { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: "SITE_MAINTENANCE" });
  });

  it("rejects form posts to public pages", () => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    expect(proxy(new NextRequest("https://canela.test/checkout", { method: "POST" })).status).toBe(503);
  });

  it.each(["/admin", "/admin/ingresar", "/admin/acceso", "/admin/pedidos/example", "/api/admin/auth/verify", "/api/admin/auth/logout", "/api/admin/orders/example/preparation", "/api/webhooks/mercado-pago", "/api/revalidate", "/api/internal/notifications", "/robots.txt"])("preserves existing authentication and handlers for %s", (path) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    const response = proxy(new NextRequest(`https://canela.test${path}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("x-middleware-rewrite")).toBe(false);
  });

  it.each(["0", ""])("restores normal routing with flag %j", (value) => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", value);
    for (const path of ["/", "/checkout", "/api/checkout"]) {
      expect(proxy(new NextRequest(`https://canela.test${path}`)).headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("keeps UI assets available while matching pages and public APIs", () => {
    for (const url of ["/_next/static/chunks/app.js", "/_next/image?url=%2Fcanela-logo.png&w=96&q=75", "/canela-logo.png", "/icon.png"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
    for (const url of ["/", "/checkout", "/api/checkout", "/mantenimiento"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
  });
});
