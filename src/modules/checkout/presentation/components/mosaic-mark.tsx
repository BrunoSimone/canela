const tiles = [
  "#8a621d",
  "#d6a33e",
  "#5e8c4e",
  "#b06a52",
  "#4a3527",
  "#8a9256",
  "#d6a33e",
  "#5e8c4e",
];

export function MosaicMark({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden
      className={`grid grid-cols-4 gap-1 ${compact ? "w-[76px]" : "w-[116px]"}`}
    >
      {tiles.map((color, index) => (
        <span
          key={`${color}-${index}`}
          className={`${compact ? "h-3" : "h-4"} rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.2)]`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
