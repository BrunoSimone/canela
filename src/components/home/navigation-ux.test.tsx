// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { CatalogDiscovery } from "./catalog-discovery";

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
