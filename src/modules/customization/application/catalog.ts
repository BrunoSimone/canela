import { resizeDesign, validateWorkshop, type MosaicDesign, type WorkshopConfig } from "../domain/design";
import { validatePricing, type PricingPolicy } from "../domain/estimate";

export type DesignTemplate = {
  id: string; title: string; description: string; published: boolean; demonstration: boolean; design: MosaicDesign;
};
export interface DesignCatalog {
  configuration(): Promise<WorkshopConfig>;
  templates(): Promise<DesignTemplate[]>;
  pricing(): Promise<PricingPolicy>;
}
export async function loadGallery(repository: DesignCatalog) {
  const [config, entries] = await Promise.all([repository.configuration(), repository.templates()]);
  validateWorkshop(config);
  const templates = entries.filter(t => t.published).flatMap(t => {
    try { return [{ ...t, design: resizeDesign(t.design, config, t.design.size) }]; } catch { return []; }
  });
  return { config, templates };
}
export async function loadCreator(repository: DesignCatalog, id?: string) {
  const [{ config, templates }, pricing] = await Promise.all([loadGallery(repository), repository.pricing()]);
  validatePricing(config, pricing);
  const template = templates.find(t => t.id === id) ?? null;
  return { config, pricing, template, templateUnavailable: !!id && !template };
}
