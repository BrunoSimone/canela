// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { CatalogDiscovery } from "./catalog-discovery";
import { Gallery } from "@/modules/customization/presentation/gallery";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn(() => "/") }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));
afterEach(()=>{cleanup();vi.useRealTimers();pathname.mockReturnValue("/");});
describe("UX-01 navigation and motion controls",()=>{
  it("closes the mobile menu with Escape and restores focus",async()=>{
    render(<Navbar />);const user=userEvent.setup();
    const menu=screen.getByRole("button",{name:"Menú"});
    await user.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    const nav=screen.getByRole("navigation",{name:"Navegación móvil"});
    const link=nav.querySelector("a")!;link.focus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("navigation",{name:"Navegación móvil"})).toBeNull();
    expect(document.activeElement).toBe(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });
  it("updates the current section across desktop and mobile without confusing other paths", async () => {
    const { rerender } = render(<Navbar customizationEnabled />);
    const desktop = () => screen.getByRole("navigation", { name: "Navegación principal" });
    expect(desktop().querySelector('[aria-current="page"]')).toBeNull();
    for (const [path, label] of [["/tienda", "Tienda"], ["/cuadros", "Galería de cuadros"], ["/crear-cuadro", "Crear mi cuadro"], ["/crear-cuadro/resumen", "Crear mi cuadro"]]) {
      pathname.mockReturnValue(path);
      rerender(<Navbar customizationEnabled />);
      expect([...desktop().querySelectorAll('[aria-current="page"]')].map(a => a.textContent)).toEqual([label]);
      await userEvent.click(screen.getByRole("button", { name: "Menú" }));
      const mobile = screen.getByRole("navigation", { name: "Navegación móvil" });
      expect([...mobile.querySelectorAll('[aria-current="page"]')].map(a => a.textContent)).toEqual([label]);
      await userEvent.keyboard("{Escape}");
    }
    pathname.mockReturnValue("/cuadros-extra");
    rerender(<Navbar customizationEnabled />);
    expect(desktop().querySelector('[aria-current="page"]')).toBeNull();
    pathname.mockReturnValue("/tienda");
    rerender(<Navbar />);
    expect([...desktop().querySelectorAll('[aria-current="page"]')].map(a => a.textContent)).toEqual(["Tienda"]);
    expect(screen.getByRole("link", { name: "Cómo comprar" }).getAttribute("aria-current")).toBeNull();
  });
  it("rotates without a pause control, including after selecting or focusing a slide",()=>{
    vi.useFakeTimers();
    render(<Hero slides={[{name:"Pieza A",caption:"Cerámica",href:"#ceramica",imageUrl:null},{name:"Pieza B",caption:"Vidrio",href:"#vidrio",imageUrl:null}]} />);
    expect(screen.queryByRole("button",{name:/pausar|reanudar/i})).toBeNull();
    act(()=>vi.advanceTimersByTime(4200));
    expect(screen.getByRole("link",{name:"Ver Pieza B"})).toBeTruthy();
    act(()=>vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole("button",{name:"Ver pieza 1"}));
    act(()=>vi.advanceTimersByTime(3500));
    expect(screen.getByRole("link",{name:"Ver Pieza A"})).toBeTruthy();
    act(()=>vi.advanceTimersByTime(700));
    const second=screen.getByRole("link",{name:"Ver Pieza B"});
    fireEvent.focus(second);
    act(()=>vi.advanceTimersByTime(4200));
    expect(screen.getByRole("link",{name:"Ver Pieza A"})).toBeTruthy();
  });
  it("keeps the store hero focused on its catalog",()=>{
    render(<Hero slides={[]} />);
    expect(screen.getByRole("heading",{name:"Tienda",level:1})).toBeTruthy();
    expect(screen.getByRole("link",{name:"Ver catálogo"}).getAttribute("href")).toBe("#catalogo");
    expect(screen.queryByRole("link",{name:"Crear mi cuadro"})).toBeNull();
  });
  it("opens the selected gallery design from the shared hero and keeps photo upload available",async()=>{
    const templates=await demoDesignCatalog.templates();
    vi.useFakeTimers();
    render(<Gallery templates={templates} />);
    expect(screen.getByRole("heading",{name:"Galería de cuadros",level:1})).toBeTruthy();
    expect(screen.getByRole("link",{name:"Ver diseños"}).getAttribute("href")).toBe("#disenos");
    expect(screen.getByRole("region",{name:"Diseños de cuadros"}).id).toBe("disenos");
    expect(screen.getByRole("link",{name:"Crear mi diseño"}).getAttribute("href")).toBe("/crear-cuadro");
    fireEvent.click(screen.getByRole("button",{name:"Ver cuadro 2"}));
    const selected=templates[1];
    expect(screen.getByRole("link",{name:`Ver ${selected.title}`}).getAttribute("href")).toBe(`/crear-cuadro?diseno=${encodeURIComponent(selected.id)}`);
    expect(screen.getByRole("img",{name:`Cuadro ${selected.title}`})).toBeTruthy();
    expect(screen.queryByRole("img",{name:`Cuadro ${templates[0].title}`})).toBeNull();
    act(()=>vi.advanceTimersByTime(4200));
    expect(screen.getByRole("link",{name:`Ver ${templates[2].title}`})).toBeTruthy();
    expect(screen.queryByRole("button",{name:/pausar/i})).toBeNull();
  });
  it("keeps the gallery useful without published designs",()=>{
    render(<Gallery templates={[]} />);
    expect(screen.getByRole("heading",{name:"Galería de cuadros",level:1})).toBeTruthy();
    expect(screen.getByRole("link",{name:"Crear mi diseño"}).getAttribute("href")).toBe("/crear-cuadro");
    expect(screen.getByRole("heading",{name:"No hay diseños disponibles"})).toBeTruthy();
    expect(screen.queryByRole("button",{name:/Ver cuadro/})).toBeNull();
  });
  it("makes gallery and creator reachable from mobile navigation and closes the menu on selection",async()=>{
    const { rerender }=render(<Navbar customizationEnabled />);
    await userEvent.click(screen.getByRole("button",{name:"Menú"}));
    const mobile=within(screen.getByRole("navigation",{name:"Navegación móvil"}));
    expect(mobile.getByRole("link",{name:"Galería de cuadros"}).getAttribute("href")).toBe("/cuadros");
    expect(mobile.getByRole("link",{name:"Tienda"}).getAttribute("href")).toBe("/tienda");
    const creator=mobile.getByRole("link",{name:"Crear mi cuadro"});
    expect(creator.getAttribute("href")).toBe("/crear-cuadro");
    creator.addEventListener("click",event=>event.preventDefault());
    await userEvent.click(creator);
    expect(screen.queryByRole("navigation",{name:"Navegación móvil"})).toBeNull();
    rerender(<Navbar />);
    expect(screen.queryByRole("link",{name:"Crear mi cuadro"})).toBeNull();
    expect(screen.queryByRole("link",{name:"Galería de cuadros"})).toBeNull();
  });
  it("links directly to all three catalog sections",()=>{
    render(<CatalogDiscovery />);
    expect(screen.getAllByRole("link").map(a=>a.getAttribute("href"))).toEqual(["#vidrio","#ceramica","#espejos"]);
  });
});
