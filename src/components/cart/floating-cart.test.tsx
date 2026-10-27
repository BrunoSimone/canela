// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createAppStore } from "@/store/store";
import { hydrateCart } from "@/modules/cart/presentation/state/cart-slice";
import { FloatingCart } from "./floating-cart";
const route = vi.hoisted(() => ({ pathname: '/tienda' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
afterEach(() => {cleanup(); route.pathname='/tienda';});
describe("UX-02 accessible cart", () => {
  it("shows a subtotal, names quantity controls and restores focus after Escape", async () => {
    const store = createAppStore();
    store.dispatch(hydrateCart([{id:"a",name:"Cuenco",price:100,qty:2,checkoutEligible:true}]));
    render(<Provider store={store}><FloatingCart checkoutEnabled /></Provider>);
    const trigger = screen.getByRole("button", {name:/Mi carrito/});
    await userEvent.click(trigger);
    await screen.findByRole("dialog", {name:"Mi carrito"});
    expect(screen.getByText("Subtotal de productos")).toBeTruthy();
    expect(screen.getAllByText("$200")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", {name:"Agregar uno de Cuenco"}));
    expect(store.getState().cart.items[0].qty).toBe(3);
    await userEvent.keyboard("{Escape}");
    await waitFor(()=>expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(()=>expect(document.activeElement).toBe(trigger));
  });
  it('keeps the separate frame flow clear without losing the stock cart', () => {
    const store=createAppStore();store.dispatch(hydrateCart([{id:'a',name:'Cuenco',price:100,qty:2,checkoutEligible:true}]));
    route.pathname='/cuadros/resultado/token';const {rerender}=render(<Provider store={store}><FloatingCart checkoutEnabled /></Provider>);
    expect(screen.queryByRole('button',{name:/Mi carrito/})).toBeNull();expect(store.getState().cart.items[0].qty).toBe(2);
    route.pathname='/tienda';rerender(<Provider store={store}><FloatingCart checkoutEnabled /></Provider>);expect(screen.getByRole('button',{name:/Mi carrito/})).toBeTruthy();
  });

});
