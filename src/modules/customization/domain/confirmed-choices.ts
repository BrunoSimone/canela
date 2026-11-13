import type { WorkshopDocument } from "./workshop-document";
import { CURRENT_TILE_FORMAT } from "./tile-format";
import { COLOR_VARIATION_NOTICE } from "./appearance";

/** Current confirmed format (PER-153/PER-155). Geometry, packaging, prices and delivery time stay pending. */
export function applyConfirmedChoices(
  source: WorkshopDocument,
  enabledColorIds: ReadonlySet<string>,
): WorkshopDocument {
  const document = structuredClone(source);
  Object.assign(document.geometry, CURRENT_TILE_FORMAT);
  document.colors = document.colors.map(color => ({
    ...color,
    enabled: enabledColorIds.has(color.publicId),
  }));
  document.confirmations.pricing = false;
  document.confirmations.packaging = false;
  document.confirmations.palette = true;
  document.confirmations.geometry = false;
  document.confirmations.production = false;
  document.productionDays = null;
  document.capacity = null;
  if (!document.termsText.includes(COLOR_VARIATION_NOTICE)) {
    document.termsText = [document.termsText.trim(), COLOR_VARIATION_NOTICE]
      .filter(Boolean)
      .join("\n\n");
  }
  document.confirmations.terms = false;
  return document;
}
