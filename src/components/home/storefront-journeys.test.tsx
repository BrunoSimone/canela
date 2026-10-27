// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "@/app/(marketing)/page";
import StorePage, { metadata } from "@/app/(marketing)/tienda/page";
import MarketingLayout from "@/app/(marketing)/layout";
import CreatorPage from "@/app/(marketing)/crear-cuadro/page";
import GalleryPage from "@/app/(marketing)/cuadros/page";
import sitemap from "@/app/sitemap";
import { siteConfig } from "@/lib/config";
import { getProducts } from "@/lib/api";

const { stockList } = vi.hoisted(() => ({ stockList: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/", notFound: () => { throw new Error("NOT_FOUND"); } }));
// Next's image optimizer configuration is supplied by its server, absent in jsdom.
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
vi.mock("@/modules/checkout/infrastructure/server/checkout-availability", () => ({ isCheckoutReady: () => true }));
vi.mock("@/modules/inventory/infrastructure/sanity-documents", () => ({ inventoryStore: () => ({ list: stockList }) }));
vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), getProducts: vi.fn(), getHeroSlides: async () => [] }));

const image = { _type: "image", asset: { _type: "reference", _ref: "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-100x100-png" } };
const products = [
  { _id: "cuenco", name: "Cuenco de prueba", price: 1500, category: "ceramica" as const, sub: "Casa", images: [image] },
  { _id: "maceta", name: "Maceta agotada", price: 2000, category: "ceramica" as const, sub: "Jardín", images: [] },
  { _id: "oculto", name: "Pieza oculta", price: 3000, category: "vidrio" as const, sub: "Reciclado", images: [] },
];
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("CUADROS_PREVIEW_ENABLED", "1");
  vi.mocked(getProducts).mockResolvedValue(products);
  stockList.mockResolvedValue([
    { id: "cuenco", enabled: true, stockOnHand: 3, reserved: 1 },
    { id: "maceta", enabled: true, stockOnHand: 1, reserved: 1 },
    { id: "oculto", enabled: false, stockOnHand: 10, reserved: 0 },
  ]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); vi.unstubAllEnvs(); });

describe("PER-141: public routes and shared cart", () => {
  it("loads only the two destinations on home and omits gated links in production", async () => {
    const { rerender, container } = render(<MarketingLayout>{await HomePage()}</MarketingLayout>);
    expect(getProducts).not.toHaveBeenCalled();
    expect(stockList).not.toHaveBeenCalled();
    const opening = within(screen.getByRole("navigation", { name: "Elegí tu recorrido" }));
    expect(opening.getByRole("link", { name: "Crear mi cuadro" }).getAttribute("href")).toBe("/crear-cuadro");
    expect(opening.getByRole("link", { name: "Explorar la tienda" }).getAttribute("href")).toBe("/tienda");
    const destinations = within(screen.getByRole("main")).getAllByRole("link").map(link => link.getAttribute("href"));
    expect(new Set(destinations)).toEqual(new Set(["/crear-cuadro", "/tienda"]));
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(screen.queryByText(/Nuestro taller/)).toBeNull();
    vi.stubEnv("VERCEL_ENV", "production");
    rerender(<MarketingLayout>{await HomePage()}</MarketingLayout>);
    expect(screen.queryByRole("link", { name: "Crear mi cuadro" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Galería de cuadros" })).toBeNull();
    expect(within(screen.getByRole("main")).getAllByRole("link")).toHaveLength(1);
  });
  it("filters the store, opens a photo, adds to cart and retains the purchase across sections", async () => {
    const user = userEvent.setup();
    const storePage = await StorePage();
    const { rerender, container } = render(<MarketingLayout>{storePage}</MarketingLayout>);
    expect(stockList).toHaveBeenCalledWith(products.map(p => ({ id: p._id, name: p.name, price: p.price })));
    expect(screen.queryByText("Pieza oculta")).toBeNull();
    expect((screen.getByRole("button", { name: "Agotado" }) as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('script[type="application/ld+json"]')?.textContent).toContain("/tienda#ceramica");
    const category = within(container.querySelector("#ceramica") as HTMLElement);
    await user.click(category.getByRole("button", { name: /^Casa/ }));
    expect(screen.queryByText("Maceta agotada")).toBeNull();
    await user.click(category.getByRole("button", { name: "Ampliar Cuenco de prueba" }));
    const photo = within(await screen.findByRole("dialog", { name: "Cuenco de prueba" }));
    await user.click(photo.getByRole("button", { name: /Agregar al carrito/ }));
    await user.click(photo.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    for (const page of [await HomePage(), await CreatorPage({ searchParams: Promise.resolve({}) }), storePage]) {
      rerender(<MarketingLayout>{page}</MarketingLayout>);
      await user.click(screen.getByRole("button", { name: "Mi carrito, 1 pieza" }));
      const cart = within(await screen.findByRole("dialog", { name: "Mi carrito" }));
      expect(cart.getByText("Cuenco de prueba")).toBeTruthy();
      expect(cart.getAllByText("$1.500")).toHaveLength(2);
      expect(cart.getByRole("link", { name: "Continuar con la compra" }).getAttribute("href")).toBe("/checkout");
      await user.click(cart.getByRole("button", { name: "Cerrar carrito" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });
  it("blocks checkout when returning to the store after stock becomes unavailable", async () => {
    localStorage.setItem("canela:cart:v1", JSON.stringify([{ id: "maceta", name: "Maceta agotada", price: 2000, qty: 1, checkoutEligible: true }]));
    render(<MarketingLayout>{await StorePage()}</MarketingLayout>);
    await userEvent.click(screen.getByRole("button", { name: "Mi carrito, 1 pieza" }));
    const cart = within(await screen.findByRole("dialog", { name: "Mi carrito" }));
    expect(cart.queryByRole("link", { name: "Continuar con la compra" })).toBeNull();
    expect(cart.getByText(/Esta pieza ya no está disponible/)).toBeTruthy();
  });
  it.each(["store", "creator", "gallery"])("keeps the appropriate guide directly before the footer on %s", async route => {
    const page = route === "store" ? await StorePage() : route === "creator" ? await CreatorPage({ searchParams: Promise.resolve({ diseno: "atardecer" }) }) : await GalleryPage();
    render(<MarketingLayout>{page}</MarketingLayout>);
    const guide = screen.getByRole("region", { name: route === "store" ? "Cómo comprar en la tienda" : "Cómo comprar tu cuadro" });
    const main = screen.getByRole("main");
    expect(main.lastElementChild).toBe(guide);
    expect(main.nextElementSibling).toBe(screen.getByRole("contentinfo"));
    if (route === "creator") {
      await userEvent.click(screen.getByRole("button", { name: "Revisar mi cuadro" }));
      expect(screen.getByRole("heading", { name: "Revisá tu cuadro" })).toBeTruthy();
      expect(main.lastElementChild).toBe(guide);
    }
  });
  it("gives the catalog its own canonical and sitemap entry", () => {
    expect(metadata.alternates?.canonical).toBe("/tienda");
    expect(sitemap().map(entry => entry.url)).toEqual([siteConfig.url, `${siteConfig.url}/tienda`]);
  });
});
