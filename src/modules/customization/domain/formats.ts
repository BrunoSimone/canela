import { renderMosaic, validateDesign, type MosaicDesign, type WorkshopConfig } from './design';
export const FRAME_FORMATS = ['1x1','2x2'] as const;
export type FrameFormat = typeof FRAME_FORMATS[number];
export function frameFormat(value:unknown):FrameFormat {
  if(value===undefined||value==='1x1')return '1x1';
  if(value==='2x2')return value;
  throw Error('Formato de venecita no válido.');
}
export function formatOf(config:Pick<WorkshopConfig,'tileMm'>):FrameFormat{return config.tileMm<15?'1x1':'2x2';}
export function formatLabel(config:Pick<WorkshopConfig,'tileMm'>){return formatOf(config)==='1x1'?'1×1':'2×2';}
/** Explicit template adaptation. Historic order snapshots remain untouched. */
export function adaptTemplate(source:MosaicDesign,config:WorkshopConfig,size:number):MosaicDesign {
  validateDesign(source);
  const colors=new Map(source.config.palette.map(c=>[c.id,c.hex]));
  const data=new Uint8ClampedArray(source.size**2*4);
  source.cells.forEach((id,i)=>{const hex=colors.get(id)!;data.set([parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255],i*4);});
  return renderMosaic({width:source.size,height:source.size,data},config,size);
}
