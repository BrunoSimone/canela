import { dimensions, validateDesign, validateWorkshop, type MosaicDesign, type WorkshopConfig } from './design';
import { estimateFrame, validatePricing, type PricingPolicy } from './estimate';
import type { ParcelDimensions } from '@/modules/shipping/domain/parcel-plan';
import type { DesignSelection } from './purchase';

export const workshopChecks = ['geometry', 'palette', 'pricing', 'packaging', 'production', 'terms'] as const;
export type WorkshopCheck = typeof workshopChecks[number];
export type FrameWorkshop = {
  config: WorkshopConfig;
  pricing: PricingPolicy;
  materials: Record<string, string>;
  packages: Array<ParcelDimensions & { maxCells: number; classificationId: string }>;
  capacity: number;
  productionDays: number;
  terms: { version: string; text: string };
  confirmations: Record<WorkshopCheck, boolean>;
};
export class FrameCommerceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 409) { super(message); }
}
export function validateFrameWorkshop(w: FrameWorkshop): void {
  validateWorkshop(w.config); validatePricing(w.config, w.pricing);
  if (!Number.isSafeInteger(w.capacity) || w.capacity < 1 || w.capacity > 100 ||
      !Number.isSafeInteger(w.productionDays) || w.productionDays < 1 || w.productionDays > 365 ||
      !w.terms.version || w.terms.version.length > 80 || !w.terms.text.trim() || w.terms.text.length > 6000 ||
      workshopChecks.some(k => typeof w.confirmations[k] !== 'boolean') ||
      w.config.palette.some(c => !w.materials[c.id] || w.materials[c.id].length > 100) ||
      !w.packages.length || w.packages.length > 100 || w.packages.at(-1)!.maxCells < w.config.maxCells ||
      w.packages.some((p,i) => !Number.isSafeInteger(p.maxCells) || p.maxCells < w.config.minCells || p.maxCells > w.config.maxCells ||
        (i > 0 && p.maxCells <= w.packages[i-1].maxCells) || !/^[1-9]\d{0,3}$/.test(p.classificationId) ||
        ![p.weightGrams,p.widthCm,p.heightCm,p.lengthCm].every(n=>Number.isSafeInteger(n)&&n>0) ||
        Math.min(p.widthCm,p.lengthCm)*10 < dimensions(w.config,p.maxCells).framedMm)) {
    throw new FrameCommerceError('WORKSHOP_INVALID', 'Faltan datos válidos del taller.', 503);
  }
}
export function workshopPending(w: FrameWorkshop): string[] {
  validateFrameWorkshop(w);
  return [...workshopChecks.filter(k=>!w.confirmations[k]), ...(w.config.provisional ? ['configuration_provisional'] : []), ...(w.pricing.provisional ? ['pricing_provisional'] : [])];
}
export function acceptedDesign(w: FrameWorkshop, selection: DesignSelection): MosaicDesign {
  if (selection.configurationId !== w.config.id || selection.configurationVersion !== w.config.version)
    throw new FrameCommerceError('DESIGN_CHANGED', 'Las opciones del taller cambiaron. Volvé al creador para revisar tu cuadro.');
  const design = { version: selection.version, algorithm: selection.algorithm, size: selection.size, cells: selection.cells, config: structuredClone(w.config) } as MosaicDesign;
  try { validateDesign(design); } catch { throw new FrameCommerceError('INVALID_DESIGN', 'Revisá el diseño antes de continuar.', 422); }
  return structuredClone(design);
}
export function framePrice(w: FrameWorkshop, size: number) { return estimateFrame(w.config, size, w.pricing).totalCents; }

export function requireProductionWorkshop(w: FrameWorkshop): void {
  if (workshopPending(w).length) throw new FrameCommerceError('WORKSHOP_PENDING', 'Estamos terminando de preparar las opciones del taller. Probá más tarde.', 503);
}
