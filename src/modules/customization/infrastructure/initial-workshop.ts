import { workshopDocument } from '../domain/workshop-document';
import { COLOR_VARIATION_NOTICE } from '../domain/appearance';
import { CURRENT_TILE_FORMAT } from '../domain/tile-format';
import { previewWorkshop } from './format-options';

/** Only confirmed choices seed a NEW draft. Existing drafts/orders are preserved. */
export async function initialWorkshopDocument() {
  const document = workshopDocument(await previewWorkshop('1x1'));
  Object.assign(document.geometry, CURRENT_TILE_FORMAT);
  document.confirmations.palette = true;
  document.confirmations.geometry = false;
  document.confirmations.production = false;
  document.productionDays = null;
  document.capacity = null;
  document.termsText = COLOR_VARIATION_NOTICE;
  document.confirmations.terms = false;
  const large=workshopDocument(await previewWorkshop('2x2'));
  document.formatsVersion=1;
  document.largeFormat={geometry:large.geometry,colors:large.colors,pricing:large.pricing,packages:large.packages,confirmations:{geometry:false,palette:true,pricing:false,packaging:false}};
  return document;
}
