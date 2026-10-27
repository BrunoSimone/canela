import { memo } from "react";

/** A reusable 2×2 tile surface keeps decoration bounded even at 45×45.
 * No filters or photo detail: this is generic relief, not calibrated glass. */
export const MosaicMaterial = memo(function MosaicMaterial({ id, tileMm: t, groutMm, frameMm, mosaicMm }: {
  id: string; tileMm: number; groutMm: number; frameMm: number; mosaicMm: number;
}) {
  const pitch = t + groutMm, edge = t * .03;
  return <g aria-hidden="true" pointerEvents="none" data-material-surface="true">
    <defs>
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="white" stopOpacity=".16" />
        <stop offset=".36" stopColor="white" stopOpacity=".015" />
        <stop offset=".72" stopColor="black" stopOpacity=".015" />
        <stop offset="1" stopColor="black" stopOpacity=".09" />
      </linearGradient>
      <g id={`${id}-bevel`}>
        <rect width={t} height={t} rx={t * .0275} fill={`url(#${id}-sheen)`} />
        <path d={`M${edge} ${t - edge}V${edge}H${t - edge}`} fill="none" stroke="white" strokeOpacity=".27" strokeWidth={t * .035} />
        <path d={`M${edge} ${t - edge}H${t - edge}V${edge}`} fill="none" stroke="black" strokeOpacity=".18" strokeWidth={t * .0325} />
      </g>
      <pattern id={`${id}-surface`} x={frameMm} y={frameMm} width={pitch * 2} height={pitch * 2} patternUnits="userSpaceOnUse">
        {[0, 1, 2, 3].map(n => <g key={n} transform={`translate(${n % 2 * pitch} ${Math.floor(n / 2) * pitch})`}>
          <use href={`#${id}-bevel`} />
          {Array.from({ length: 10 }, (_, j) => <ellipse key={j}
            cx={t * (.08 + ((j * 31 + n * 17) % 79) / 100)} cy={t * (.08 + ((j * 47 + n * 23) % 79) / 100)}
            rx={t * (.006 + j % 3 * .005)} ry={t * .006} fill={j % 2 ? "white" : "black"} opacity=".075" />)}
        </g>)}
      </pattern>
    </defs>
    <rect x={frameMm} y={frameMm} width={mosaicMm} height={mosaicMm} fill={`url(#${id}-surface)`} />
  </g>;
});
