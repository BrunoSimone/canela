import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import GalleryPage from "@/app/(marketing)/cuadros/page";
import CreatorPage from "@/app/(marketing)/crear-cuadro/page";
import { proxy } from "@/proxy";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
afterEach(() => vi.unstubAllEnvs());
describe("PER-130: route gates and server data", () => {
  it("renders the demonstration gallery from its server repository", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = renderToStaticMarkup(await GalleryPage());
    expect(html).toContain("Crear mi diseño");
    expect(html).not.toMatch(/Diseño de ejemplo|Versión de prueba/);
    expect(html).toContain("/crear-cuadro?diseno=palmera");
    expect(html).not.toContain("Comprar");
  });
  it("opens the requested template and rejects invalid selection accessibly", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = renderToStaticMarkup(await CreatorPage({ searchParams: Promise.resolve({ diseno: "palmera" }) }));
    expect(html).toContain("Tu mosaico de 25 por 25");
    const missing = renderToStaticMarkup(await CreatorPage({ searchParams: Promise.resolve({ diseno: ["palmera", "private"] }) }));
    expect(missing).toContain("Ese diseño no está disponible");
    expect(missing).not.toContain("Tu mosaico de 25");
  });
  it("hides both routes on production unless explicitly enabled", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CUADROS_PREVIEW_ENABLED", "0");
    await expect(GalleryPage()).rejects.toThrow("NOT_FOUND");
    await expect(CreatorPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  });
  it.each(["/cuadros", "/crear-cuadro?diseno=palmera"])("respects maintenance for %s", path => {
    vi.stubEnv("SITE_MAINTENANCE_MODE", "1");
    expect(proxy(new NextRequest(`https://www.canela-store.com${path}`)).status).toBe(503);
  });
});
