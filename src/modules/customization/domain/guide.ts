import { cm, dimensions, materialCounts, validateDesign, type MosaicDesign } from "./design";

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function guideHtml(design: MosaicDesign): string {
  validateDesign(design);
  const counts = materialCounts(design), measure = dimensions(design.config, design.size);
  const index = new Map(counts.map((color, i) => [color.id, i + 1]));
  const size = design.size, cell = 18, offset = 24, side = size * cell + offset;
  const rectangles = design.cells.map((id, i) => {
    const x = offset + (i % size) * cell, y = offset + Math.floor(i / size) * cell;
    const hex = counts.find(c => c.id === id)!.hex;
    // White label background keeps every material number readable when printed.
    return `<g data-cell="${i}"><rect x="${x}" y="${y}" width="18" height="18" fill="${hex}" stroke="#bbb" stroke-width=".5"/><rect x="${x + 3}" y="${y + 3}" width="12" height="12" rx="2" fill="white" fill-opacity=".86"/><text x="${x + 9}" y="${y + 12}" text-anchor="middle" font-size="9" fill="#222">${index.get(id)}</text></g>`;
  }).join("");
  const coordinates = Array.from({ length: size }, (_, i) => `<text x="${offset + i * cell + 9}" y="16" text-anchor="middle" font-size="9">${i + 1}</text><text x="15" y="${offset + i * cell + 12}" text-anchor="middle" font-size="9">${i + 1}</text>`).join("");
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Canela · Guía de prueba</title><style>
body{font-family:Arial,sans-serif;max-width:850px;margin:24px auto;padding:0 16px;color:#302a23}h1{font-size:24px}p{line-height:1.5}.warning{padding:12px;background:#fff3cf;border:1px solid #b19049}svg{width:100%;height:auto;max-height:65vh}table{border-collapse:collapse;width:100%;font-size:12px}td,th{text-align:left;padding:7px;border-bottom:1px solid #ddd}th{background:#f3f0e9}.swatch{display:inline-block;width:14px;height:14px;border:1px solid #888;vertical-align:middle;margin-right:8px}button{padding:12px 20px;cursor:pointer} @media print{button{display:none}body{margin:0;max-width:none}svg{max-height:180mm}.warning{font-weight:bold}tr{break-inside:avoid}}@page{size:A4;margin:12mm}</style>
<button onclick="window.print()">Imprimir / Guardar PDF</button><h1>Canela · Guía de prueba</h1><p class="warning">No fabricar: medidas y colores de demostración, pendientes de confirmación del taller.</p>
<p>${size} × ${size} · ${size ** 2} venecitas enteras<br>Mosaico: ${cm(measure.mosaicMm)} × ${cm(measure.mosaicMm)} cm. Con marco: ${cm(measure.framedMm)} × ${cm(measure.framedMm)} cm.<br>Venecita: ${design.config.tileMm} mm · Junta: ${design.config.groutMm} mm · Marco por lado: ${design.config.frameMm} mm.</p>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" role="img" aria-label="Cuadrícula numerada">${coordinates}${rectangles}</svg>
<table><thead><tr><th>Número</th><th>Color</th><th>Código</th><th>Cantidad</th></tr></thead><tbody>${counts.map((c, i) => `<tr><td>${i + 1}</td><td><span class="swatch" style="background:${c.hex}"></span>${escape(c.name)}</td><td>${escape(c.id)}</td><td>${c.count}</td></tr>`).join("")}</tbody></table>
<p>Configuración ${escape(design.config.id)} / ${escape(design.config.version)} · ${escape(design.algorithm)}. La cuadrícula se lee de izquierda a derecha y de arriba abajo. Impresión de referencia, no a escala real.</p></html>`;
}
