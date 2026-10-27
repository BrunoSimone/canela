import { validateDesign, type MosaicDesign } from "./design";
export type TileOverrides = Record<number, string>;
type Edit = { index: number; before?: string; after?: string };
export type RetouchHistory = { present: TileOverrides; past: Edit[]; future: Edit[] };
export const emptyRetouches = (): RetouchHistory => ({ present: {}, past: [], future: [] });
function validIndex(design: MosaicDesign, index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= design.cells.length) throw new Error("Elegí una venecita dentro del cuadro.");
}
function assign(present: TileOverrides, index: number, color: string | undefined): TileOverrides {
  const copy = { ...present };
  if (color === undefined) delete copy[index]; else copy[index] = color;
  return copy;
}
function commit(history: RetouchHistory, index: number, color?: string): RetouchHistory {
  const before = history.present[index];
  if (before === color) return history;
  return { present: assign(history.present, index, color), past: [...history.past, { index, before, after: color }].slice(-100), future: [] };
}
export function paintTile(history: RetouchHistory, base: MosaicDesign, index: number, color: string): RetouchHistory {
  validateDesign(base); validIndex(base, index);
  if (!base.config.palette.some(p => p.id === color)) throw new Error("Elegí un color de la paleta disponible.");
  if ((history.present[index] ?? base.cells[index]) === color) return history;
  return commit(history, index, color === base.cells[index] ? undefined : color);
}
export function restoreTile(history: RetouchHistory, base: MosaicDesign, index: number): RetouchHistory {
  validateDesign(base); validIndex(base, index); return commit(history, index);
}
export function undoRetouch(history: RetouchHistory): RetouchHistory {
  const edit = history.past.at(-1); if (!edit) return history;
  return { present: assign(history.present, edit.index, edit.before), past: history.past.slice(0, -1), future: [...history.future, edit] };
}
export function redoRetouch(history: RetouchHistory): RetouchHistory {
  const edit = history.future.at(-1); if (!edit) return history;
  return { present: assign(history.present, edit.index, edit.after), past: [...history.past, edit], future: history.future.slice(0, -1) };
}
export function applyRetouches(base: MosaicDesign, overrides: TileOverrides): MosaicDesign {
  validateDesign(base); const cells = [...base.cells]; const allowed = new Set(base.config.palette.map(p => p.id));
  for (const [key, color] of Object.entries(overrides)) {
    const index = Number(key); validIndex(base, index);
    if (!allowed.has(color)) throw new Error("El retoque usa un color no disponible.");
    cells[index] = color;
  }
  return { ...base, cells };
}
