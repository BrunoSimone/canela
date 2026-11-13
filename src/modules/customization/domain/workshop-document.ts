import type { FrameFormat } from './formats';
import type { FrameWorkshop } from './workshop';
import { validateFrameWorkshop } from './workshop';
export type WorkshopDocument={formatsVersion?:1;largeFormat?:WorkshopProfile;_rev:string;geometry:FrameWorkshop['config'];colors:Array<{publicId:string;name:string;hex:string;material:string;enabled:boolean}>;pricing:{version:string;tilePackArs:number;tilePackQuantity:number;roundToArs:number;sizes:Array<{cells:number;laborArs:number;suppliesArs:number}>};packages:FrameWorkshop['packages'];capacity:number|null;productionDays:number|null;termsText:string;confirmations:FrameWorkshop['confirmations']};
export type WorkshopProfile=Pick<WorkshopDocument,'geometry'|'colors'|'pricing'|'packages'>&{confirmations:Pick<FrameWorkshop['confirmations'],'geometry'|'palette'|'pricing'|'packaging'>};
const cents=(v:number)=>{const c=Math.round(v*100);if(!Number.isFinite(v)||Math.abs(c-v*100)>0.0001) throw Error('Invalid price');return c;};
export function parseWorkshopDocument(source:WorkshopDocument,format:FrameFormat='1x1'):FrameWorkshop {
  if(format==='2x2'&&!source.largeFormat)throw Error('El formato 2×2 todavía no está configurado.');
  const d=format==='2x2'?{...source,...source.largeFormat!,confirmations:{...source.confirmations,...source.largeFormat!.confirmations}}:source;
  if(typeof d.productionDays!=='number'||typeof d.capacity!=='number')throw Error('Manufacturing lead time and capacity are pending');
  const {tileMm,groutMm,frameMm,minCells,maxCells,step,backgroundColorId}=d.geometry;
  const config={tileMm,groutMm,frameMm,minCells,maxCells,step,backgroundColorId,id:format==='1x1'?'canela-workshop':'canela-workshop-2x2',version:format==='1x1'?d._rev:`${d._rev}-2x2`,provisional:!d.confirmations.geometry||!d.confirmations.palette,palette:d.colors.filter(c=>c.enabled).map(c=>({id:c.publicId,name:c.name,hex:c.hex}))};
  const pricing={version:d._rev,currency:'ARS' as const,provisional:!d.confirmations.pricing,tilePackCents:cents(d.pricing.tilePackArs),tilePackQuantity:d.pricing.tilePackQuantity,roundToCents:cents(d.pricing.roundToArs),sizes:d.pricing.sizes.map(s=>({cells:s.cells,laborCents:cents(s.laborArs),suppliesCents:cents(s.suppliesArs)}))};
  const w={config,pricing,materials:Object.fromEntries(d.colors.filter(c=>c.enabled).map(c=>[c.publicId,c.material])),packages:d.packages.map(({maxCells,weightGrams,widthCm,heightCm,lengthCm,classificationId})=>({maxCells,weightGrams,widthCm,heightCm,lengthCm,classificationId})),capacity:d.capacity,productionDays:d.productionDays,terms:{version:d._rev,text:d.termsText},confirmations:d.confirmations};
  validateFrameWorkshop(w);return w;
}

/** Editable shape shared by the private panel and server, never sent to buyers. */
export function workshopDocument(w:FrameWorkshop):WorkshopDocument {
  return {_rev:w.config.version,geometry:{...w.config},colors:w.config.palette.map(c=>({publicId:c.id,name:c.name,hex:c.hex,material:w.materials[c.id],enabled:true})),pricing:{version:w.pricing.version,tilePackArs:w.pricing.tilePackCents/100,tilePackQuantity:w.pricing.tilePackQuantity,roundToArs:w.pricing.roundToCents/100,sizes:w.pricing.sizes.map(s=>({cells:s.cells,laborArs:s.laborCents/100,suppliesArs:s.suppliesCents/100}))},packages:structuredClone(w.packages),capacity:w.capacity,productionDays:w.productionDays,termsText:w.terms.text,confirmations:{...w.confirmations}};
}
