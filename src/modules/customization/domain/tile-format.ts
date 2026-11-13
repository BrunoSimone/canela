/** Current manufacturing format. Keep independent of private supplier references. */
export const CURRENT_TILE_FORMAT = {
  tileMm: 11,
  groutMm: 1,
  frameMm: 10,
  minCells: 15,
  maxCells: 90,
  step: 1,
} as const;
export const CURRENT_FORMAT_VERSION = "2026-10-30.classic-11mm-1";
