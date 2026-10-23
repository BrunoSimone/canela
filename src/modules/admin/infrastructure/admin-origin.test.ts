import { afterEach, describe, expect, it, vi } from "vitest";

import { adminRequestOrigin, isSameOriginAdminRequest } from "./admin-origin";

const url = "https://canela.test/api/admin/auth/verify";
afterEach(() => vi.unstubAllEnvs());

describe("local browser host", () => {
  it("preserves a loopback alias and accepts its same-origin form", () => {
    vi.stubEnv("NODE_ENV", "development");
    const request = new Request("http://localhost:3000/api/admin/auth/verify", {
      headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000", "Sec-Fetch-Site": "same-origin" },
    });
    expect(adminRequestOrigin(request, "https://tunnel.example")).toBe("http://127.0.0.1:3000");
    expect(isSameOriginAdminRequest(request, "https://tunnel.example")).toBe(true);
  });
  it.each(["evil.example:3000", "localhost.evil.example:3000", "127.0.0.1:4000", "127.0.0.1:3000, evil.example"])("rejects a spoofed host %s", Host => {
    vi.stubEnv("NODE_ENV", "development");
    expect(adminRequestOrigin(new Request("http://localhost:3000/api/admin", { headers: { Host } }), "https://tunnel.example")).toBe("http://localhost:3000");
  });
  it("does not allow aliases in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(adminRequestOrigin(new Request("http://localhost:3000/api/admin", { headers: { Host: "127.0.0.1:3000" } }), "https://canela-store.com")).toBe("http://localhost:3000");
  });
});

describe("admin request origin validation", () => {
  it.each([
    { origin: "https://canela.test", site: "same-origin", expected: true },
    { origin: "https://canela.test", site: undefined, expected: true },
    { origin: "null", site: "same-origin", expected: true },
    { origin: undefined, site: "same-origin", expected: true },
    { origin: "null", site: "cross-site", expected: false },
    { origin: "null", site: "same-site", expected: false },
    { origin: "null", site: "none", expected: false },
    { origin: "null", site: undefined, expected: false },
    { origin: undefined, site: undefined, expected: false },
    { origin: "https://elsewhere.test", site: "same-origin", expected: false },
    { origin: "http://canela.test", site: "same-origin", expected: false },
    { origin: "https://canela.test", site: "cross-site", expected: false },
  ])("validates Origin=$origin and Sec-Fetch-Site=$site", ({ origin, site, expected }) => {
    const headers = new Headers();
    if (origin !== undefined) headers.set("Origin", origin);
    if (site !== undefined) headers.set("Sec-Fetch-Site", site);
    expect(isSameOriginAdminRequest(new Request(url, { method: "POST", headers })))
      .toBe(expected);
  });
});

describe("admin origin behind an HTTPS proxy", () => {
  const publicUrl = "https://canela-tunnel.example";
  const internalUrl = "https://localhost:3000/api/admin/orders";
  function proxied(headers: Record<string, string>) {
    return new Request(internalUrl, { method: "POST", headers });
  }
  it("uses only the configured public origin for a matching forwarded host", () => {
    const request = proxied({ "X-Forwarded-Host": "canela-tunnel.example", Origin: publicUrl, "Sec-Fetch-Site": "same-origin" });
    expect(adminRequestOrigin(request, publicUrl)).toBe(publicUrl);
    expect(isSameOriginAdminRequest(request, publicUrl)).toBe(true);
  });
  it("supports the public Host header without a forwarded header", () => {
    expect(adminRequestOrigin(proxied({ Host: "canela-tunnel.example" }), publicUrl)).toBe(publicUrl);
  });
  it.each(["evil.example", "canela-tunnel.example, evil.example", "canela-tunnel.example.evil.example"])("ignores untrusted forwarded host %s", host => {
    const request = proxied({ "X-Forwarded-Host": host, Origin: "https://evil.example", "Sec-Fetch-Site": "same-origin" });
    expect(adminRequestOrigin(request, publicUrl)).toBe("https://localhost:3000");
    expect(isSameOriginAdminRequest(request, publicUrl)).toBe(false);
  });
  it.each([
    { origin: publicUrl, site: "cross-site" },
    { origin: "https://evil.example", site: "same-origin" },
    { origin: "http://canela-tunnel.example", site: "same-origin" },
  ])("rejects mismatched Origin or fetch metadata: $origin/$site", ({ origin, site }) => {
    expect(isSameOriginAdminRequest(proxied({ "X-Forwarded-Host": "canela-tunnel.example", Origin: origin, "Sec-Fetch-Site": site }), publicUrl)).toBe(false);
  });
});
