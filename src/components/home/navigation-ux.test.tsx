// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import { Hero } from "./hero";

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
    fireEvent.focus(pause);fireEvent.click(pause);
    act(()=>vi.advanceTimersByTime(5000));
    expect(screen.getByRole("link",{name:"Ver Pieza A"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Reanudar carrusel"}));
    act(()=>vi.advanceTimersByTime(4300));
    expect(screen.getByRole("link",{name:"Ver Pieza B"})).toBeTruthy();
  });
});
