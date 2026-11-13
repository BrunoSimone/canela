import type { FrameFormat } from '../domain/formats';
import type { FrameWorkshop } from '../domain/workshop';
import { dimensions } from '../domain/design';
import { demoWorkshop } from './demo-workshop';
import { activeMaterials, paletteForMaterials, materialsForPalette } from './storefront-palette';
import materials from './murvi-palette.json';
const missing=new Set(['murvi-o-40','murvi-o-48','murvi-o-12','murvi-m-20','murvi-l-46','murvi-c-14','murvi-m-08','murvi-n-07','murvi-n-19']);
export const smallFormatMaterials=materials.colors.filter(c=>(activeMaterials.some(m=>m.id===c.id)&&!missing.has(c.id))||['murvi-di100','murvi-di97'].includes(c.id));
export async function previewWorkshop(format:FrameFormat):Promise<FrameWorkshop>{
 const w=await demoWorkshop(),selected=format==='1x1'?smallFormatMaterials:activeMaterials;
 w.config={...w.config,id:format==='1x1'?'canela-demo-1x1':'canela-demo-2x2',version:'formats-preview-157-1',tileMm:format==='1x1'?11:20,maxCells:format==='1x1'?90:45,palette:paletteForMaterials(selected)};
 w.materials=materialsForPalette(selected);
 w.pricing={...w.pricing,version:`${w.config.version}-${format}`,sizes:w.pricing.sizes.filter(s=>s.cells<=w.config.maxCells)};
 w.packages=w.packages.filter(p=>p.maxCells<=w.config.maxCells).map(p=>({...p,widthCm:Math.ceil(dimensions(w.config,p.maxCells).framedMm/10)+4,lengthCm:Math.ceil(dimensions(w.config,p.maxCells).framedMm/10)+4}));
 return w;
}
