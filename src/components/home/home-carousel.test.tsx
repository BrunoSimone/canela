// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HomeCarousel } from "./home-carousel";

const { reduced } = vi.hoisted(() => ({ reduced: vi.fn(() => false) }));
vi.mock("motion/react", () => ({ useReducedMotion: reduced }));
const props = {
  creatorEnabled: true,
  photo: <span role="img" aria-label="Productos de Canela" />,
  frame: <span role="img" aria-label="Cuadro de ejemplo" />,
  photoThumbnail: <span>Foto</span>,
  frameThumbnail: <span>Mosaico</span>,
};
const frameButton = () => screen.getByRole("button", { name: "Ver cuadros personalizados" });
const storeButton = () => screen.getByRole("button", { name: "Ver productos de la tienda" });
beforeEach(() => {
  vi.useFakeTimers();
  reduced.mockReturnValue(false);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("PER-143: home visual carousel", () => {
  it("opens on the frame and keeps both routes fixed while selecting either image", () => {
    render(<HomeCarousel {...props} />);
    expect(screen.getByRole("img", { name: "Cuadro de ejemplo" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Productos de Canela" })).toBeNull();
    expect(frameButton().getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { level: 1 }).closest("a")).toBeNull();
    const routes = within(screen.getByRole("navigation", { name: "Elegí tu recorrido" }));
    const creator = routes.getByRole("link", { name: "Crear mi cuadro" });
    const store = routes.getByRole("link", { name: "Explorar la tienda" });
    fireEvent.click(storeButton());
    expect(screen.getByRole("img", { name: "Productos de Canela" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Cuadro de ejemplo" })).toBeNull();
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    expect(creator.getAttribute("href")).toBe("/crear-cuadro");
    expect(store.getAttribute("href")).toBe("/tienda");
    fireEvent.click(frameButton());
    expect(screen.getByRole("img", { name: "Cuadro de ejemplo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /pausar/i })).toBeNull();
  });
  it("rotates every six seconds and waits while the visitor interacts", () => {
    const { unmount } = render(<HomeCarousel {...props} />);
    const carousel = screen.getByRole("region");
    act(() => vi.advanceTimersByTime(6000));
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(12000));
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.mouseLeave(carousel);
    act(() => vi.advanceTimersByTime(6000));
    expect(frameButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.focus(frameButton());
    act(() => vi.advanceTimersByTime(12000));
    expect(frameButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.blur(frameButton(), { relatedTarget: document.body });
    act(() => vi.advanceTimersByTime(6000));
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("suspends in a hidden tab and resumes with a fresh interval", () => {
    render(<HomeCarousel {...props} />);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(12000));
    expect(frameButton().getAttribute("aria-pressed")).toBe("true");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(6000));
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
  });
  it("keeps manual selection with reduced motion and does not auto advance", () => {
    reduced.mockReturnValue(true);
    render(<HomeCarousel {...props} />);
    act(() => vi.advanceTimersByTime(18000));
    expect(frameButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(storeButton());
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("accepts a horizontal swipe, but not vertical scroll or gestures on navigation", () => {
    render(<HomeCarousel {...props} />);
    const carousel = screen.getByRole("region");
    const swipe = (target: Element, endX: number, endY: number) => {
      fireEvent.touchStart(target, { touches: [{ clientX: 250, clientY: 200 }] });
      fireEvent.touchEnd(target, { changedTouches: [{ clientX: endX, clientY: endY }] });
    };
    swipe(carousel, 100, 210);
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    swipe(carousel, 245, 60);
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    swipe(screen.getByRole("link", { name: "Crear mi cuadro" }), 100, 210);
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 200 }, { clientX: 260, clientY: 210 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100, clientY: 200 }] });
    expect(storeButton().getAttribute("aria-pressed")).toBe("true");
  });
  it("renders only the store when customization is disabled, including after a rerender", () => {
    const scheduled = vi.spyOn(globalThis, "setTimeout");
    const cancelled = vi.spyOn(globalThis, "clearTimeout");
    const { rerender } = render(<HomeCarousel {...props} />);
    const rotation = scheduled.mock.results[scheduled.mock.calls.findIndex(([, delay]) => delay === 6000)].value;
    rerender(<HomeCarousel {...props} creatorEnabled={false} />);
    expect(screen.getByRole("img", { name: "Productos de Canela" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Cuadro de ejemplo" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/tienda");
    expect(screen.queryByRole("button")).toBeNull();
    expect(cancelled).toHaveBeenCalledWith(rotation);
  });
});
