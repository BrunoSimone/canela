// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { HomeDestinations } from "./home-destinations";
import { ComoComprar } from "./como-comprar";
import { Footer } from "./footer";
import { LegacyCatalogLinks } from "./legacy-catalog-links";
import { BuyingGuideLink } from "./buying-guide-link";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";

const { replace, pathname } = vi.hoisted(() => ({ replace: vi.fn(), pathname: vi.fn(() => "/") }));
vi.mock("next/image", () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: pathname }));
afterEach(() => { cleanup(); vi.clearAllMocks(); pathname.mockReturnValue("/"); window.history.replaceState({}, "", "/"); });

describe("PER-141: two storefront journeys", () => {
  it("offers both journeys beside the welcome without making the photo a store link", async () => {
    const templates = await demoDesignCatalog.templates();
    const { container, rerender } = render(<HomeDestinations products={[]} templates={templates} />);
    const opening = screen.getByRole("navigation", { name: "Elegí tu recorrido" });
    const routes = within(opening);
    expect(routes.getByRole("link", { name: "Explorar la tienda" }).getAttribute("href")).toBe("/tienda");
    expect(routes.getByRole("link", { name: "Crear mi cuadro" }).getAttribute("href")).toBe("/crear-cuadro");
    expect(routes.getAllByRole("link")).toHaveLength(2);
    const welcome = screen.getByRole("heading", { name: "Creá tu cuadro personalizado o explorá nuestro catálogo." });
    expect(welcome.closest("a")).toBeNull();
    expect(welcome.nextElementSibling).toBe(opening);
    expect(screen.getAllByRole("link", { name: "Crear mi cuadro" })).toHaveLength(1);
    expect(screen.getByRole("img", { name: /Cuadro en mosaico:/ })).toBeTruthy();
    expect(container.textContent).not.toMatch(/diseño de ejemplo|versión de prueba/i);
    expect(container.innerHTML).not.toMatch(/murvi|Vitro|DI99|Nuestro taller/i);
    rerender(<HomeDestinations products={[]} templates={[]} />);
    expect(within(screen.getByRole("navigation", { name: "Elegí tu recorrido" })).getByRole("link", { name: "Crear mi cuadro" })).toBeTruthy();
    rerender(<HomeDestinations products={[]} templates={null} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Crear mi cuadro" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Explorá nuestro catálogo." })).toBeTruthy();
  });
  it("uses real photos only as a decorative background, keeping exactly two destinations", async () => {
    const { container, rerender } = render(<HomeDestinations products={[{ id: "cuenco", src: "/cuenco.jpg" }, { id: "vaso", src: "/vaso.jpg" }]}
      templates={await demoDesignCatalog.templates()} />);
    const photos = [...container.querySelectorAll('[data-src][aria-label=""]')];
    expect(photos).toHaveLength(25);
    expect(new Set(photos.map(p => p.getAttribute("data-src")))).toEqual(new Set(["/cuenco.jpg", "/vaso.jpg"]));
    for (const photo of photos) expect(photo.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/crear-cuadro", "/tienda"]);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(<HomeDestinations products={[]} templates={null} />);
    expect(container.querySelector('[data-src][aria-label=""]')).toBeNull();
    const piece = screen.getByRole("img", { name: "Pieza de ajedrez de cerámica de Canela" });
    expect(piece.getAttribute("data-src")).toContain("aca61f0c0b27615757104c53f3b53fcde12cc083-3456x4608.png");
    expect(piece.closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "Explorar la tienda" })).toBeTruthy();
  });
  it("explains the appropriate checkout and only offers simulation where available", () => {
    const { rerender } = render(<ComoComprar variant="store" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Pagá con Mercado Pago")).toBeTruthy();
    rerender(<ComoComprar variant="frames" purchaseDemoEnabled />);
    expect(screen.getByRole("heading", { name: "Cómo comprar tu cuadro" })).toBeTruthy();
    expect(screen.getByText("Probá la compra")).toBeTruthy();
    expect(screen.getByText(/No se cobra dinero/)).toBeTruthy();
    expect(screen.queryByText("Pagá con Mercado Pago")).toBeNull();
    rerender(<ComoComprar variant="frames" />);
    expect(screen.queryByText("Probá la compra")).toBeNull();
    expect(screen.getByText(/Por ahora podés diseñar y revisar tu cuadro/)).toBeTruthy();
  });
  it("points footer categories and help to their sections, honoring the feature gate", () => {
    const { rerender } = render(<Footer customizationEnabled />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", { name: "Vidrio" }).getAttribute("href")).toBe("/tienda#vidrio");
    expect(footer.getByRole("link", { name: "Cómo comprar en la tienda" }).getAttribute("href")).toBe("/tienda#como-comprar");
    expect(footer.getByRole("link", { name: "Cómo comprar tu cuadro" }).getAttribute("href")).toBe("/crear-cuadro#como-comprar");
    expect(footer.queryByRole("link", { name: "Nosotros" })).toBeNull();
    rerender(<Footer />);
    expect(screen.queryByRole("link", { name: "Crear mi cuadro" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Cómo comprar tu cuadro" })).toBeNull();
  });
  it.each(["catalogo", "vidrio", "ceramica", "espejos", "como-comprar"])("preserves old #%s links", hash => {
    window.history.replaceState({}, "", `/?origen=link#${hash}`);
    render(<LegacyCatalogLinks />);
    expect(replace).toHaveBeenCalledWith(`/tienda?origen=link#${hash}`);
  });
  it.each(["/crear-cuadro", "/cuadros"])("keeps frame help on %s without discarding the current design or query", path => {
    pathname.mockReturnValue(path);
    render(<BuyingGuideLink href="/crear-cuadro#como-comprar">Cómo comprar tu cuadro</BuyingGuideLink>);
    expect(screen.getByRole("link").getAttribute("href")).toBe("#como-comprar");
  });
  it("ignores unrelated anchors and migrates hash changes until unmount", () => {
    window.history.replaceState({}, "", "/#contenido");
    const { unmount } = render(<LegacyCatalogLinks />);
    expect(replace).not.toHaveBeenCalled();
    window.history.replaceState({}, "", "/#ceramica");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(replace).toHaveBeenCalledOnce();
    unmount();
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(replace).toHaveBeenCalledOnce();
  });
});
