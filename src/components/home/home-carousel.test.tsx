// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HomeCarousel } from "./home-carousel";

const { reduced } = vi.hoisted(() => ({ reduced: vi.fn(() => false) }));
vi.mock("motion/react", () => ({ useReducedMotion: reduced }));
const props = {
  creatorEnabled: true,
  catalogBackdrop: <span role="img" aria-label="Fondo del catálogo" />,
  frame: <span role="img" aria-label="Cuadro de ejemplo" />,
  frameBackdrop: <span role="img" aria-label="Fondo decorativo" />,
};
const activeVisual = () => screen.getByRole("region").getAttribute("data-visual");
beforeEach(() => {
  vi.useFakeTimers();
  reduced.mockReturnValue(false);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("PER-143: home visual carousel", () => {
  it("opens on the frame and keeps both routes fixed through automatic changes", () => {
    render(<HomeCarousel {...props} />);
    expect(screen.getByRole("img", { name: "Cuadro de ejemplo" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Fondo del catálogo" })).toBeNull();
    expect(activeVisual()).toBe("frames");
    expect(screen.getByRole("heading", { level: 1 }).closest("a")).toBeNull();
    const routes = within(screen.getByRole("navigation", { name: "Elegí tu recorrido" }));
    const creator = routes.getByRole("link", { name: "Crear mi cuadro" });
    const store = routes.getByRole("link", { name: "Explorar la tienda" });
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByRole("img", { name: "Fondo del catálogo" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Cuadro de ejemplo" })).toBeNull();
    expect(activeVisual()).toBe("store");
    expect(creator.getAttribute("href")).toBe("/crear-cuadro");
    expect(store.getAttribute("href")).toBe("/tienda");
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole("img", { name: "Cuadro de ejemplo" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("img", { name: "Fondo decorativo" })).toBeNull();
  });
  it("keeps rotating with the pointer over the hero and a navigation link focused", () => {
    const { unmount } = render(<HomeCarousel {...props} />);
    const carousel = screen.getByRole("region");
    fireEvent.mouseEnter(carousel);
    act(() => vi.advanceTimersByTime(6000));
    expect(activeVisual()).toBe("store");
    const link = screen.getByRole("link", { name: "Crear mi cuadro" });
    act(() => link.focus());
    act(() => vi.advanceTimersByTime(6000));
    expect(activeVisual()).toBe("frames");
    expect(document.activeElement).toBe(link);
    act(() => vi.advanceTimersByTime(6000));
    expect(activeVisual()).toBe("store");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("waits during touch and starts a fresh interval when the gesture is cancelled", () => {
    render(<HomeCarousel {...props} />);
    const carousel = screen.getByRole("region");
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.touchStart(carousel, { touches: [{ clientX: 200, clientY: 200 }] });
    act(() => vi.advanceTimersByTime(12000));
    expect(activeVisual()).toBe("frames");
    fireEvent.touchCancel(carousel);
    act(() => vi.advanceTimersByTime(5999));
    expect(activeVisual()).toBe("frames");
    act(() => vi.advanceTimersByTime(1));
    expect(activeVisual()).toBe("store");
  });
  it("suspends in a hidden tab and resumes with a fresh interval", () => {
    render(<HomeCarousel {...props} />);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(12000));
    expect(activeVisual()).toBe("frames");
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(6000));
    expect(activeVisual()).toBe("store");
  });
  it("keeps both routes and swipe available with reduced motion without auto advancing", () => {
    reduced.mockReturnValue(true);
    render(<HomeCarousel {...props} />);
    act(() => vi.advanceTimersByTime(18000));
    expect(activeVisual()).toBe("frames");
    expect(screen.getAllByRole("link")).toHaveLength(2);
    const carousel = screen.getByRole("region");
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 200 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100, clientY: 210 }] });
    expect(activeVisual()).toBe("store");
    act(() => vi.advanceTimersByTime(18000));
    expect(activeVisual()).toBe("store");
  });
  it("accepts a horizontal swipe, but not vertical scroll or gestures on navigation", () => {
    render(<HomeCarousel {...props} />);
    const carousel = screen.getByRole("region");
    const swipe = (target: Element, endX: number, endY: number) => {
      fireEvent.touchStart(target, { touches: [{ clientX: 250, clientY: 200 }] });
      fireEvent.touchEnd(target, { changedTouches: [{ clientX: endX, clientY: endY }] });
    };
    swipe(carousel, 100, 210);
    expect(activeVisual()).toBe("store");
    swipe(carousel, 245, 60);
    expect(activeVisual()).toBe("store");
    swipe(screen.getByRole("link", { name: "Crear mi cuadro" }), 100, 210);
    expect(activeVisual()).toBe("store");
    fireEvent.touchStart(carousel, { touches: [{ clientX: 250, clientY: 200 }, { clientX: 260, clientY: 210 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 100, clientY: 200 }] });
    expect(activeVisual()).toBe("store");
  });
  it("renders only the store when customization is disabled, including after a rerender", () => {
    const scheduled = vi.spyOn(globalThis, "setTimeout");
    const cancelled = vi.spyOn(globalThis, "clearTimeout");
    const { rerender } = render(<HomeCarousel {...props} />);
    const rotation = scheduled.mock.results[scheduled.mock.calls.findIndex(([, delay]) => delay === 6000)].value;
    rerender(<HomeCarousel {...props} creatorEnabled={false} />);
    expect(activeVisual()).toBe("store");
    expect(screen.queryByRole("img", { name: "Fondo del catálogo" })).toBeNull();
    expect(screen.queryByRole("img", { name: "Cuadro de ejemplo" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/tienda");
    expect(screen.queryByRole("button")).toBeNull();
    expect(cancelled).toHaveBeenCalledWith(rotation);
  });
});
