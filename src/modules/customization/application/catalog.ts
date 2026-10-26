import { resizeDesign, validateWorkshop, type MosaicDesign, type WorkshopConfig } from "../domain/design";

export type DesignTemplate = {
  id: string; title: string; description: string; published: boolean; demonstration: boolean; design: MosaicDesign;
};
export interface DesignCatalog {
  configuration(): Promise<WorkshopConfig>;
  templates(): Promise<DesignTemplate[]>;
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
  const { config, templates } = await loadGallery(repository);
  const template = templates.find(t => t.id === id) ?? null;
  return { config, template, example: templates[0] ?? null, templateUnavailable: !!id && !template };
}
