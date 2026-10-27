import { dimensions, type WorkshopConfig } from "../domain/design";
export type Point = { x: number; y: number };
export type Viewport = { width: number; height: number };
export type MosaicView = Point & { scale: number };
export const fittedView = (): MosaicView => ({ scale: 1, x: 0, y: 0 });
export const artSide = (viewport: Viewport) => Math.max(1, Math.min(viewport.width, viewport.height) - 40);
export function constrain(view: MosaicView, viewport: Viewport): MosaicView {
  const scale = Math.max(1, Math.min(8, view.scale));
  const side = artSide(viewport) * scale;
  const maxX = Math.max(0, (side - viewport.width) / 2 + 20);
  const maxY = Math.max(0, (side - viewport.height) / 2 + 20);
  return { scale, x: Math.max(-maxX, Math.min(maxX, view.x)), y: Math.max(-maxY, Math.min(maxY, view.y)) };
}
export function zoomAt(view: MosaicView, scale: number, point: Point, viewport: Viewport): MosaicView {
  const next = Math.max(1, Math.min(8, scale)); const ratio = next / view.scale;
  const x = point.x - viewport.width / 2, y = point.y - viewport.height / 2;
  return constrain({ scale: next, x: x - (x - view.x) * ratio, y: y - (y - view.y) * ratio }, viewport);
}
export function tileAt(point: Point, view: MosaicView, viewport: Viewport, config: WorkshopConfig, size: number): number | null {
  const side = artSide(viewport); const { framedMm } = dimensions(config, size);
  const x = ((point.x - viewport.width / 2 - view.x) / view.scale + side / 2) / side * framedMm - config.frameMm;
  const y = ((point.y - viewport.height / 2 - view.y) / view.scale + side / 2) / side * framedMm - config.frameMm;
  const pitch = config.tileMm + config.groutMm;
  const col = Math.floor(x / pitch), row = Math.floor(y / pitch);
  if (x < 0 || y < 0 || col >= size || row >= size || x - col * pitch >= config.tileMm || y - row * pitch >= config.tileMm) return null;
  return row * size + col;
}
export function centerTile(index: number, view: MosaicView, viewport: Viewport, config: WorkshopConfig, size: number): MosaicView {
  const { framedMm } = dimensions(config, size); const pitch = config.tileMm + config.groutMm;
  const center = (cell: number) => (config.frameMm + cell * pitch + config.tileMm / 2) / framedMm - .5;
  return constrain({ scale: view.scale, x: -center(index % size) * artSide(viewport) * view.scale, y: -center(Math.floor(index / size)) * artSide(viewport) * view.scale }, viewport);
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Pointer arbitration is independent of rendering, so touch sequences are testable. */
export class MosaicGestures {
  view = fittedView();
  private points = new Map<number, Point>();
  private origin: Point = { x: 0, y: 0 };
  private startView = fittedView();
  private startDistance = 1;
  private moved = false;
  constructor(public viewport: Viewport) {}
  get active() { return this.points.size > 0; }
  setView(view: MosaicView) { this.view = constrain(view, this.viewport); }
  resize(viewport: Viewport) { this.points.clear(); this.moved = true; this.viewport = viewport; this.setView(this.view); }
  down(id: number, point: Point) {
    if (this.points.size >= 2 || this.points.has(id)) return;
    this.points.set(id, point); const points = [...this.points.values()];
    if (points.length === 1) { this.origin = point; this.startView = this.view; this.moved = false; }
    else { this.moved = true; this.origin = midpoint(points[0], points[1]); this.startDistance = Math.max(1, distance(points[0], points[1])); this.startView = this.view; }
  }
  move(id: number, point: Point) {
    if (!this.points.has(id)) return;
    this.points.set(id, point); const points = [...this.points.values()];
    if (points.length >= 2) {
      const center = midpoint(points[0], points[1]);
      const zoomed = zoomAt(this.startView, this.startView.scale * distance(points[0], points[1]) / this.startDistance, this.origin, this.viewport);
      this.setView({ ...zoomed, x: zoomed.x + center.x - this.origin.x, y: zoomed.y + center.y - this.origin.y });
    } else {
      if (distance(this.origin, point) > 6) this.moved = true;
      if (this.moved) this.setView({ ...this.startView, x: this.startView.x + point.x - this.origin.x, y: this.startView.y + point.y - this.origin.y });
    }
  }
  up(id: number, point: Point, cancelled = false): Point | null {
    if (!this.points.has(id)) return null;
    const tap = !cancelled && !this.moved && this.points.size === 1 && distance(this.origin, point) <= 6 ? point : null;
    this.points.delete(id);
    if (this.points.size) { this.moved = true; this.origin = [...this.points.values()][0]; this.startView = this.view; }
    return tap;
  }
}
