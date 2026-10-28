import type { FrameWorkshop } from './workshop';
import { validateFrameWorkshop } from './workshop';
export type WorkshopDocument={_rev:string;geometry:FrameWorkshop['config'];colors:Array<{publicId:string;name:string;hex:string;material:string;enabled:boolean}>;pricing:{version:string;tilePackArs:number;tilePackQuantity:number;roundToArs:number;sizes:Array<{cells:number;laborArs:number;suppliesArs:number}>};packages:FrameWorkshop['packages'];capacity:number;productionDays:number;termsText:string;confirmations:FrameWorkshop['confirmations']};
const cents=(v:number)=>{const c=Math.round(v*100);if(!Number.isFinite(v)||Math.abs(c-v*100)>0.0001) throw Error('Invalid price');return c;};
export function parseWorkshopDocument(d:WorkshopDocument):FrameWorkshop {
  const {tileMm,groutMm,frameMm,minCells,maxCells,step,backgroundColorId}=d.geometry;
  const config={tileMm,groutMm,frameMm,minCells,maxCells,step,backgroundColorId,id:'canela-workshop',version:d._rev,provisional:!d.confirmations.geometry||!d.confirmations.palette,palette:d.colors.filter(c=>c.enabled).map(c=>({id:c.publicId,name:c.name,hex:c.hex}))};
  const pricing={version:d._rev,currency:'ARS' as const,provisional:!d.confirmations.pricing,tilePackCents:cents(d.pricing.tilePackArs),tilePackQuantity:d.pricing.tilePackQuantity,roundToCents:cents(d.pricing.roundToArs),sizes:d.pricing.sizes.map(s=>({cells:s.cells,laborCents:cents(s.laborArs),suppliesCents:cents(s.suppliesArs)}))};
  const w={config,pricing,materials:Object.fromEntries(d.colors.filter(c=>c.enabled).map(c=>[c.publicId,c.material])),packages:d.packages.map(({maxCells,weightGrams,widthCm,heightCm,lengthCm,classificationId})=>({maxCells,weightGrams,widthCm,heightCm,lengthCm,classificationId})),capacity:d.capacity,productionDays:d.productionDays,terms:{version:d._rev,text:d.termsText},confirmations:d.confirmations};
  validateFrameWorkshop(w);return w;
}

/** Editable shape shared by the private panel and server, never sent to buyers. */
export function workshopDocument(w:FrameWorkshop):WorkshopDocument {
  return {_rev:w.config.version,geometry:{...w.config},colors:w.config.palette.map(c=>({publicId:c.id,name:c.name,hex:c.hex,material:w.materials[c.id],enabled:true})),pricing:{version:w.pricing.version,tilePackArs:w.pricing.tilePackCents/100,tilePackQuantity:w.pricing.tilePackQuantity,roundToArs:w.pricing.roundToCents/100,sizes:w.pricing.sizes.map(s=>({cells:s.cells,laborArs:s.laborCents/100,suppliesArs:s.suppliesCents/100}))},packages:structuredClone(w.packages),capacity:w.capacity,productionDays:w.productionDays,termsText:w.terms.text,confirmations:{...w.confirmations}};
}
