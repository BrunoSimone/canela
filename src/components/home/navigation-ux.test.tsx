// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { CreatorSpotlight } from "./creator-spotlight";
import { CatalogDiscovery } from "./catalog-discovery";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";

afterEach(()=>{cleanup();vi.useRealTimers();});
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
  it("can pause and resume the carousel without focus undoing the click",()=>{
    vi.useFakeTimers();
    render(<Hero slides={[{name:"Pieza A",caption:"Cerámica",href:"#ceramica",imageUrl:null},{name:"Pieza B",caption:"Vidrio",href:"#vidrio",imageUrl:null}]} />);
    const pause=screen.getByRole("button",{name:"Pausar carrusel"});
    expect(pause.textContent).toBe("");
    fireEvent.focus(pause);fireEvent.click(pause);
    act(()=>vi.advanceTimersByTime(5000));
    expect(screen.getByRole("link",{name:"Ver Pieza A"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Reanudar carrusel"}));
    act(()=>vi.advanceTimersByTime(4300));
    expect(screen.getByRole("link",{name:"Ver Pieza B"})).toBeTruthy();
  });
  it("promotes the creator and keeps a direct catalog path only when enabled",()=>{
    const { rerender }=render(<Hero slides={[]} customizationEnabled />);
    expect(screen.getByRole("link",{name:"Crear mi cuadro"}).getAttribute("href")).toBe("/crear-cuadro");
    expect(screen.getByRole("link",{name:"Explorar la tienda"}).getAttribute("href")).toBe("#catalogo");
    rerender(<Hero slides={[]} />);
    expect(screen.queryByRole("link",{name:"Crear mi cuadro"})).toBeNull();
    expect(screen.getByRole("link",{name:"Ver catálogo"}).getAttribute("href")).toBe("#catalogo");
  });
  it("makes gallery and creator reachable from mobile navigation and closes the menu on selection",async()=>{
    const { rerender }=render(<Navbar customizationEnabled />);
    await userEvent.click(screen.getByRole("button",{name:"Menú"}));
    const mobile=within(screen.getByRole("navigation",{name:"Navegación móvil"}));
    expect(mobile.getByRole("link",{name:"Galería de cuadros"}).getAttribute("href")).toBe("/cuadros");
    const creator=mobile.getByRole("link",{name:"Crear mi cuadro"});
    expect(creator.getAttribute("href")).toBe("/crear-cuadro");
    creator.addEventListener("click",event=>event.preventDefault());
    await userEvent.click(creator);
    expect(screen.queryByRole("navigation",{name:"Navegación móvil"})).toBeNull();
    rerender(<Navbar />);
    expect(screen.queryByRole("link",{name:"Crear mi cuadro"})).toBeNull();
    expect(screen.queryByRole("link",{name:"Galería de cuadros"})).toBeNull();
  });
  it("offers a complete creation path, marks examples and works without gallery entries",async()=>{
    const templates=await demoDesignCatalog.templates();
    const { container, rerender }=render(<CreatorSpotlight templates={templates} />);
    expect(screen.getByRole("link",{name:"Empezar mi cuadro"}).getAttribute("href")).toBe("/crear-cuadro");
    expect(screen.getByRole("link",{name:"Ver galería de diseños"}).getAttribute("href")).toBe("/cuadros");
    expect(screen.getByText("Diseños de ejemplo")).toBeTruthy();
    expect(container.innerHTML).not.toMatch(/murvi|Vitro|DI99/i);
    rerender(<CreatorSpotlight templates={[]} />);
    expect(screen.getByRole("link",{name:"Abrir el creador de cuadros"})).toBeTruthy();
  });
  it("links directly to all three catalog sections",()=>{
    render(<CatalogDiscovery />);
    expect(screen.getAllByRole("link").map(a=>a.getAttribute("href"))).toEqual(["#vidrio","#ceramica","#espejos"]);
  });
});
