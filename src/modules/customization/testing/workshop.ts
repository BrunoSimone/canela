import type { WorkshopConfig } from "../domain/design";

export const testWorkshop: WorkshopConfig = {
  id: "test", version: "1", provisional: true,
  tileMm: 20, groutMm: 1, frameMm: 10, minCells: 2, maxCells: 45, step: 1,
  backgroundColorId: "white",
  palette: [{ id: "white", name: "Blanco", hex: "#ffffff" }, { id: "black", name: "Negro", hex: "#000000" }, { id: "red", name: "Rojo", hex: "#ff0000" }],
};

export function raster(width = 4, height = 4, color = [255, 0, 0, 255]) {
  return { width, height, data: new Uint8ClampedArray(Array.from({ length: width * height }, () => color).flat()) };
}
