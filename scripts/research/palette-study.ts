import { converter } from "culori";
import { centerCrop, dimensions, renderMosaic, validateDesign, type MosaicDesign, type Raster, type TileColor, type WorkshopConfig } from "../../src/modules/customization/domain/design";

export const additions = [
  { id: "study-beige", name: "Beige", hex: "#d7b598", candidate: "V55", purpose: "Pieles claras y pelajes crema" },
  { id: "study-durazno", name: "Durazno", hex: "#edc5aa", candidate: "S82", purpose: "Luces y transiciones cálidas" },
  { id: "study-salmon", name: "Salmón", hex: "#d49a91", candidate: "M186", purpose: "Matices rosados de la piel" },
  { id: "study-marron-claro", name: "Marrón claro", hex: "#b98461", candidate: "M55", purpose: "Tonos medios cálidos" },
  { id: "study-marron-medio", name: "Marrón medio", hex: "#895438", candidate: "M54", purpose: "Sombras cálidas, piel y pelaje" },
  { id: "study-gris-claro", name: "Gris claro neutro", hex: "#dedede", candidate: "S22", purpose: "Luces de pelaje y blancos" },
  { id: "study-gris-oscuro", name: "Gris oscuro neutro", hex: "#767676", candidate: "S21", purpose: "Sombras sin dominante verde" },
] as const;

export const candidateSource = "https://buenosairesmosaicos.mitiendanube.com/productos/venecitas-clasicas-importadas-2x2-cm-x-blister-25u/";
export function expandedConfig(base: WorkshopConfig): WorkshopConfig {
  return { ...structuredClone(base), id: "canela-palette-study", version: "2026-10-27.hypothesis-1", provisional: true,
    palette: [...structuredClone(base.palette), ...additions.map(({ id, name, hex }) => ({ id, name: `${name} · hipótesis`, hex }))] };
}

const lab = converter("oklab"), rgb = converter("rgb");
// Match the app's bounded 4×4 samples exactly; this is a reporting helper only.
export function sampledColors(image: Raster, config: WorkshopConfig, size: number) {
  const crop = centerCrop(image), background = rgb(config.palette.find(c => c.id === config.backgroundColorId)!.hex)!;
  return Array.from({ length: size * size }, (_, cell) => {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
      const x = Math.min(image.width - 1, Math.floor(crop.x + (cell % size + (sx + .5) / 4) * crop.width / size));
      const y = Math.min(image.height - 1, Math.floor(crop.y + (Math.floor(cell / size) + (sy + .5) / 4) * crop.height / size));
      const i = (y * image.width + x) * 4, a = image.data[i + 3] / 255;
      r += image.data[i] / 255 * a + background.r * (1 - a);
      g += image.data[i + 1] / 255 * a + background.g * (1 - a);
      b += image.data[i + 2] / 255 * a + background.b * (1 - a);
    }
    return lab({ mode: "rgb", r: r / 16, g: g / 16, b: b / 16 })!;
  });
}

export function colorError(image: Raster, design: MosaicDesign) {
  validateDesign(design);
  const colors = new Map(design.config.palette.map(c => [c.id, lab(c.hex)!]));
  const distances = sampledColors(image, design.config, design.size).map((s, i) => {
    const c = colors.get(design.cells[i])!;
    return Math.hypot(s.l - c.l, s.a - c.a, s.b - c.b) * 100;
  });
  return distances.reduce((a, b) => a + b, 0) / distances.length;
}

export function compare(image: Raster, base: WorkshopConfig, size: number) {
  const current = renderMosaic(image, base, size), proposed = renderMosaic(image, expandedConfig(base), size);
  const beforeError = colorError(image, current), afterError = colorError(image, proposed);
  const used = additions.map(c => ({ ...c, count: proposed.cells.filter(id => id === c.id).length }));
  return { current, proposed, beforeError, afterError,
    reduction: beforeError ? (1 - afterError / beforeError) * 100 : 0,
    changed: proposed.cells.filter((id, i) => id !== current.cells[i]).length, used };
}

const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
export type Surface = "flat" | "material";
export function renderStudySvg(design: MosaicDesign, surface: Surface, light: "left" | "right" = "left", label = "Mosaico de prueba") {
  validateDesign(design);
  const { framedMm, mosaicMm } = dimensions(design.config, design.size);
  const { tileMm: t, groutMm: g, frameMm: f } = design.config;
  const colors = new Map<string, TileColor>(design.config.palette.map(c => [c.id, c]));
  const material = surface === "material";
  // Bounded deterministic generic surface. No photograph or extra colors influence cell assignment.
  const textures = Array.from({ length: 8 }, (_, n) => {
    const grains = Array.from({ length: 14 }, (_, j) => {
      const x = 1 + ((j * 31 + n * 17) % 179) / 10, y = 1 + ((j * 47 + n * 23) % 179) / 10;
      return `<ellipse cx="${x}" cy="${y}" rx="${.12 + j % 3 * .1}" ry=".12" fill="${j % 2 ? "white" : "black"}" opacity=".075"/>`;
    }).join("");
    return `<pattern id="grain${n}" width="20" height="20" patternUnits="userSpaceOnUse">${grains}</pattern>`;
  }).join("");
  const defs = material ? `<defs><linearGradient id="sheen" x1="${light === "left" ? 0 : 1}" y1="0" x2="${light === "left" ? 1 : 0}" y2="1"><stop stop-color="white" stop-opacity=".16"/><stop offset=".36" stop-color="white" stop-opacity=".015"/><stop offset=".72" stop-color="black" stop-opacity=".015"/><stop offset="1" stop-color="black" stop-opacity=".09"/></linearGradient>${textures}</defs>` : "";
  const cells = design.cells.map((id, i) => {
    const x = f + i % design.size * (t + g), y = f + Math.floor(i / design.size) * (t + g);
    const base = `<rect data-cell="${i}" data-color="${id}" x="${x}" y="${y}" width="${t}" height="${t}" fill="${colors.get(id)!.hex}"${material ? ' rx=".55"' : ""}/>`;
    if (!material) return base;
    const top = light === "left" ? `M${x+.6} ${y+t-.6}V${y+.6}H${x+t-.6}` : `M${x+.6} ${y+.6}H${x+t-.6}V${y+t-.6}`;
    const bottom = light === "left" ? `M${x+.6} ${y+t-.6}H${x+t-.6}V${y+.6}` : `M${x+.6} ${y+.6}V${y+t-.6}H${x+t-.6}`;
    return `${base}<rect x="${x}" y="${y}" width="${t}" height="${t}" rx=".55" fill="url(#sheen)"/><rect x="${x+.65}" y="${y+.65}" width="${t-1.3}" height="${t-1.3}" fill="url(#grain${(i * 7 + Math.floor(i / design.size) * 3) % 8})"/><path d="${top}" fill="none" stroke="white" stroke-opacity=".27" stroke-width=".7"/><path d="${bottom}" fill="none" stroke="black" stroke-opacity=".18" stroke-width=".65"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${framedMm} ${framedMm}" role="img" aria-label="${escapeXml(label)}">${defs}<rect width="${framedMm}" height="${framedMm}" fill="#72523c"/><rect x="${f}" y="${f}" width="${mosaicMm}" height="${mosaicMm}" fill="#e8dfcc"/><g>${cells}</g></svg>`;
}
