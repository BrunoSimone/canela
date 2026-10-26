// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createAppStore } from "@/store/store";
import { hydrateCart } from "@/modules/cart/presentation/state/cart-slice";
import { CartAvailabilitySync } from "@/modules/cart/presentation/cart-availability-sync";
import { ProductCard, type CardProduct } from "./product-card";
import { ImageLightbox } from "./image-lightbox";
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
afterEach(cleanup);
const product: CardProduct = { id: "piece", name: "Cuenco", price: 1200, categoryLabel: "Cerámica", sub: "Casa", available: true, imageUrls: ["/piece.png"], placeholderPattern: "none" };

describe("STK-03 catalog purchase experience", () => {
  it("removes the stock badge and allows an available piece into the cart", async () => {
    const store = createAppStore();
    render(<Provider store={store}><ProductCard product={product} /></Provider>);
    expect(screen.queryByText("En stock")).toBeNull();
    expect(screen.queryByText("Agotado")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Agregar al carrito" }));
    expect(store.getState().cart.items).toMatchObject([{ id: "piece", qty: 1, checkoutEligible: true }]);
  });
  it("keeps photos accessible while disabling the sold-out card", async () => {
    const store = createAppStore();
    render(<Provider store={store}><ProductCard product={{ ...product, available: false }} /></Provider>);
    const button = screen.getByRole("button", { name: "Agotado" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await userEvent.click(button);
    expect(store.getState().cart.items).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: "Ampliar Cuenco" }));
    expect(await screen.findByRole("dialog", { name: "Cuenco" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Agotado" }).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });
  it("blocks increments in an already open detail when the last unit is reserved", async () => {
    const store = createAppStore();
    store.dispatch(hydrateCart([{ id: "piece", name: "Cuenco", price: 1200, qty: 1, checkoutEligible: true }]));
    const view = (available: boolean) => <Provider store={store}><ImageLightbox open onOpenChange={() => {}} id="piece" title="Cuenco" price={1200} images={["/piece.png"]} categoryLabel="Cerámica" sub="Casa" available={available} /></Provider>;
    const { rerender } = render(view(true));
    expect((screen.getByRole("button", { name: "Agregar uno" }) as HTMLButtonElement).disabled).toBe(false);
    rerender(view(false));
    expect(screen.getByText("Agotado")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Agregar uno" }) as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Agregar uno" }));
    expect(store.getState().cart.items[0].qty).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Quitar uno" }));
    expect(store.getState().cart.items).toEqual([]);
  });
  it("STK-04 waits for hydration before reconciling persisted availability and restock", async () => {
    const store = createAppStore();
    const view = (ids: string[]) => <Provider store={store}><CartAvailabilitySync availableProductIds={ids} /></Provider>;
    const { rerender } = render(view([]));
    act(() => store.dispatch(hydrateCart([{ id: "piece", name: "Cuenco", price: 1200, qty: 2, checkoutEligible: true }])));
    await waitFor(() => expect(store.getState().cart.items[0].checkoutEligible).toBe(false));
    rerender(view(["piece"]));
    await waitFor(() => expect(store.getState().cart.items[0].checkoutEligible).toBe(true));
    expect(store.getState().cart.items[0].qty).toBe(2);
  });
});
