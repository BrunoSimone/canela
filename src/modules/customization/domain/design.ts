import { converter } from "culori";

export type TileColor = { id: string; name: string; hex: string };
export type WorkshopConfig = {
  id: string; version: string; provisional: boolean;
  tileMm: number; groutMm: number; frameMm: number;
  minCells: number; maxCells: number; step: number;
  backgroundColorId: string; palette: TileColor[];
};
export type Raster = { width: number; height: number; data: Uint8ClampedArray };
export type Crop = { x: number; y: number; width: number; height: number };
export type MosaicDesign = {
  version: 1; algorithm: "mosaic-oklab-v1"; size: number; cells: string[]; config: WorkshopConfig;
};
const lab = converter("oklab");
const rgb = converter("rgb");
const validId = (id: string) => /^[a-zA-Z0-9_-]{1,64}$/.test(id);

export function validateWorkshop(c: WorkshopConfig): void {
  if (!validId(c.id) || !c.version || c.version.length > 80 || typeof c.provisional !== "boolean" ||
      !Number.isFinite(c.tileMm) || c.tileMm < 1 || c.tileMm > 100 ||
      !Number.isFinite(c.groutMm) || c.groutMm < 0 || c.groutMm > 20 ||
      !Number.isFinite(c.frameMm) || c.frameMm < 0 || c.frameMm > 200 ||
      !Number.isInteger(c.minCells) || c.minCells < 2 || !Number.isInteger(c.maxCells) ||
      c.maxCells > 100 || c.maxCells < c.minCells || !Number.isInteger(c.step) || c.step < 1 ||
      (c.maxCells - c.minCells) % c.step !== 0 ||
      !c.palette.length || c.palette.length > 128 || new Set(c.palette.map(p => p.id)).size !== c.palette.length ||
      c.palette.some(p => !validId(p.id) || !p.name || p.name.length > 100 || !/^#[\da-f]{6}$/i.test(p.hex)) ||
      !c.palette.some(p => p.id === c.backgroundColorId)) {
    throw new Error("La configuración del taller no es válida.");
  }
}

export function dimensions(config: WorkshopConfig, size: number) {
  validateWorkshop(config);
  if (!Number.isInteger(size) || size < config.minCells || size > config.maxCells || (size - config.minCells) % config.step !== 0) {
    throw new Error("Elegí un tamaño dentro de los límites del taller.");
  }
  const mosaicMm = Math.round((size * config.tileMm + (size - 1) * config.groutMm) * 1000) / 1000;
  return { mosaicMm, framedMm: Math.round((mosaicMm + 2 * config.frameMm) * 1000) / 1000 };
}

export function cm(mm: number): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(mm / 10);
}

export function validateDesign(design: MosaicDesign): void {
  dimensions(design.config, design.size);
  const allowed = new Set(design.config.palette.map(c => c.id));
  if (design.version !== 1 || design.algorithm !== "mosaic-oklab-v1" ||
      design.cells.length !== design.size ** 2 || design.cells.some(id => !allowed.has(id))) {
    throw new Error("El diseño contiene piezas o colores inválidos.");
  }
}

export function centerCrop(image: Pick<Raster, "width" | "height">): Crop {
  const side = Math.min(image.width, image.height);
  return { x: (image.width - side) / 2, y: (image.height - side) / 2, width: side, height: side };
}

export function renderMosaic(image: Raster, config: WorkshopConfig, size: number, crop = centerCrop(image)): MosaicDesign {
  dimensions(config, size);
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 ||
      image.width * image.height > 24_000_000 || image.data.length !== image.width * image.height * 4 ||
      !Object.values(crop).every(Number.isFinite) || crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 ||
      crop.x + crop.width > image.width + 0.01 || crop.y + crop.height > image.height + 0.01) {
    throw new Error("No pudimos leer ese recorte de la imagen.");
  }
  const palette = config.palette.map(color => ({ id: color.id, lab: lab(color.hex)! }));
  const background = rgb(config.palette.find(c => c.id === config.backgroundColorId)!.hex)!;
  const cells: string[] = [];
  // A bounded, deterministic 4×4 sample per cell avoids processing a full photo
  // on every interaction. Alpha is composited before averaging and quantization.
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const x = Math.min(image.width - 1, Math.floor(crop.x + (col + (sx + 0.5) / 4) * crop.width / size));
      const y = Math.min(image.height - 1, Math.floor(crop.y + (row + (sy + 0.5) / 4) * crop.height / size));
      const i = (y * image.width + x) * 4, alpha = image.data[i + 3] / 255;
      r += image.data[i] / 255 * alpha + background.r * (1 - alpha);
      g += image.data[i + 1] / 255 * alpha + background.g * (1 - alpha);
      b += image.data[i + 2] / 255 * alpha + background.b * (1 - alpha);
    }
    const sample = lab({ mode: "rgb", r: r / 16, g: g / 16, b: b / 16 })!;
    let best = palette[0].id, distance = Infinity;
    for (const entry of palette) {
      const d = (sample.l - entry.lab.l) ** 2 + (sample.a - entry.lab.a) ** 2 + (sample.b - entry.lab.b) ** 2;
      if (d < distance) { best = entry.id; distance = d; }
    }
    cells.push(best);
  }
  return { version: 1, algorithm: "mosaic-oklab-v1", size, cells, config: structuredClone(config) };
}

export function resizeDesign(source: MosaicDesign, config: WorkshopConfig, size: number): MosaicDesign {
  validateDesign(source);
  dimensions(config, size);
  const used = new Set(source.cells);
  if (source.config.palette.some(c => used.has(c.id) && !config.palette.some(p => p.id === c.id && p.hex.toLowerCase() === c.hex.toLowerCase()))) {
    throw new Error("Este diseño usa colores que ya no están disponibles. Elegí otro diseño o cargá una imagen.");
  }
  const cells = Array.from({ length: size * size }, (_, i) => {
    const row = Math.min(source.size - 1, Math.floor((Math.floor(i / size) + 0.5) * source.size / size));
    const col = Math.min(source.size - 1, Math.floor((i % size + 0.5) * source.size / size));
    return source.cells[row * source.size + col];
  });
  return { ...source, size, cells, config: structuredClone(config) };
}

export function recolorDesign(design: MosaicDesign, replacements: Record<string, string>): MosaicDesign {
  validateDesign(design);
  const allowed = new Set(design.config.palette.map(p => p.id));
  if (Object.entries(replacements).some(([from, to]) => !allowed.has(from) || !allowed.has(to))) throw new Error("Elegí un color de la paleta disponible.");
  return { ...design, config: structuredClone(design.config), cells: design.cells.map(id => replacements[id] ?? id) };
}

export function materialCounts(design: MosaicDesign) {
  validateDesign(design);
  const counts = new Map<string, number>();
  for (const id of design.cells) counts.set(id, (counts.get(id) ?? 0) + 1);
  return design.config.palette.filter(p => counts.has(p.id)).map(p => ({ ...p, count: counts.get(p.id)! }));
}
