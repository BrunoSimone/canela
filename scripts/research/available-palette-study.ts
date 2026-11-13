import materials from '../../src/modules/customization/infrastructure/murvi-palette.json';
import { storefrontColorId } from '../../src/modules/customization/infrastructure/storefront-palette';
import { dimensions, renderMosaic, centerCrop, type Crop, type Raster, type WorkshopConfig, type MosaicDesign } from '../../src/modules/customization/domain/design';
import type { StudyFraming } from './available-study-cases';

export const AVAILABILITY_VERSION = 'PER-156.2026-11-02.1';
export const STUDY_SIZES = [30,45,60,90] as const;
export const UNAVAILABLE = ['murvi-o-40','murvi-o-48','murvi-o-12','murvi-m-20','murvi-l-46','murvi-c-14','murvi-m-08','murvi-n-07','murvi-n-19'] as const;
export const PREVIOUS_EXCLUSIONS = ['murvi-m-24','murvi-c-50'] as const;
export const ADDITIONS = ['murvi-di100','murvi-di97'] as const;
const omitted = new Set<string>([...UNAVAILABLE,...PREVIOUS_EXCLUSIONS]);
export const availableMaterials = materials.colors.filter(c=>(c.line==='Clasico'&&!omitted.has(c.id))||ADDITIONS.some(id=>id===c.id));

/** Isolated study configuration. Never used by the store or workshop repository. */
export function availableConfig(base:WorkshopConfig):WorkshopConfig {
  const names = new Map(base.palette.map(c=>[c.id,c.name]));
  names.set(storefrontColorId('murvi-di100'),'Salvia clara');
  names.set(storefrontColorId('murvi-di97'),'Oliva dorado');
  return {...structuredClone(base),version:AVAILABILITY_VERSION,palette:availableMaterials.map(c=>({id:storefrontColorId(c.id),name:names.get(storefrontColorId(c.id))??c.code,hex:c.hex}))};
}
export type AvailableResult = {size:number;before:MosaicDesign;after:MosaicDesign;generationMs:number};
/** Same square crop/zoom range available in the creator. Preserve source bytes. */
export function studyCrop(image:Pick<Raster,'width'|'height'>,framing?:StudyFraming):Crop {
  if(!framing)return centerCrop(image);
  if(![framing.zoom,framing.x,framing.y].every(Number.isFinite)||framing.zoom<1||framing.zoom>3||framing.x<0||framing.x>1||framing.y<0||framing.y>1)throw Error('Invalid study framing');
  const side=Math.min(image.width,image.height)/framing.zoom;
  return {x:(image.width-side)*framing.x,y:(image.height-side)*framing.y,width:side,height:side};
}
export function generateAvailability(image:Raster,base:WorkshopConfig,now=()=>performance.now(),crop?:Crop):AvailableResult[] {
  const config=availableConfig(base);
  return STUDY_SIZES.map(size=>{
    const before=renderMosaic(image,base,size,crop),start=now(),after=renderMosaic(image,config,size,crop);
    return {size,before,after,generationMs:now()-start};
  });
}
export function availableCaption(design:MosaicDesign) {
  const cm=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(dimensions(design.config,design.size).framedMm/10);
  return `Venecita 1,1 × 1,1 cm · Grilla ${design.size} × ${design.size} · ${cm} cm con marco`;
}
