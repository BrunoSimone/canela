import { dimensions, renderMosaic, type MosaicDesign, type Raster, type WorkshopConfig } from '../../src/modules/customization/domain/design';
import { historicalMurviConfig } from './historical-murvi-config';

export const STUDY_VERSION = 'PER-155.comparison-2';
export const VARIANTS = [
  { id:'2cm-30',format:'large',size:30,tileLabel:'2 × 2 cm' },
  { id:'2cm-45',format:'large',size:45,tileLabel:'2 × 2 cm' },
  { id:'11mm-45',format:'small',size:45,tileLabel:'1,1 × 1,1 cm' },
  { id:'11mm-90',format:'small',size:90,tileLabel:'1,1 × 1,1 cm' },
] as const;
export type Variant = typeof VARIANTS[number];
export type StudyResult = {id:Variant['id'];size:number;design:MosaicDesign;generationMs:number};
export function studyConfig(variant:Variant,current:WorkshopConfig) {
  return variant.format==='large'?historicalMurviConfig():structuredClone(current);
}
export function generateVariants(raster:Raster,current:WorkshopConfig,now=()=>performance.now()):StudyResult[] {
  return VARIANTS.map(variant=>{
    const start=now(),design=renderMosaic(raster,studyConfig(variant,current),variant.size);
    return {id:variant.id,size:variant.size,design,generationMs:now()-start};
  });
}
export function variantCaption(variant:Variant,design:MosaicDesign) {
  const cm=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(dimensions(design.config,design.size).framedMm/10);
  return `Venecita ${variant.tileLabel} · Grilla ${variant.size} × ${variant.size} · ${cm} cm con marco`;
}
