import { useId } from "react";
import { dimensions, type MosaicDesign } from "../domain/design";

export function MosaicSvg({ design, label, className }: { design: MosaicDesign; label: string; className?: string }) {
  const id = useId();
  const { framedMm, mosaicMm } = dimensions(design.config, design.size);
  const { frameMm, tileMm, groutMm } = design.config;
  const colors = new Map(design.config.palette.map(p => [p.id, p.hex]));
  return <svg className={className} viewBox={`0 0 ${framedMm} ${framedMm}`} role="img" aria-labelledby={id} xmlns="http://www.w3.org/2000/svg">
    <title id={id}>{label}</title>
    <rect width={framedMm} height={framedMm} fill="#72523c" />
    <rect x={frameMm} y={frameMm} width={mosaicMm} height={mosaicMm} fill="#e8dfcc" />
    <g aria-hidden="true">{design.cells.map((color, i) => <rect key={i}
      x={frameMm + i % design.size * (tileMm + groutMm)} y={frameMm + Math.floor(i / design.size) * (tileMm + groutMm)}
      width={tileMm} height={tileMm} fill={colors.get(color)} />)}</g>
  </svg>;
}
