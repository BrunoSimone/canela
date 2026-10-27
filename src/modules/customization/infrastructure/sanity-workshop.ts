import { privateWorkshopDataset,requirePrivateDataset } from '@/sanity/workshop-dataset';
import { createClient } from 'next-sanity';
import { apiVersion,dataset,projectId } from '@/sanity/env';
import type { DesignCatalog,DesignTemplate } from '../application/catalog';
import type { FrameWorkshop } from '../domain/workshop';
import { parseWorkshopDocument } from '../domain/workshop-document';
export { parseWorkshopDocument } from '../domain/workshop-document';
import { validateDesign, type MosaicDesign } from '../domain/design';
import { demoDesignCatalog } from './demo-catalog';
import { demoWorkshop } from './demo-workshop';
const reader=createClient({projectId,dataset,apiVersion,useCdn:false});
export async function loadFrameWorkshop():Promise<FrameWorkshop> {
  if(!usesSanityWorkshop()) return demoWorkshop();
  const privateDataset=privateWorkshopDataset(process.env.SANITY_FRAME_DATASET,dataset);
  const token=process.env.SANITY_FRAME_READ_TOKEN;
  if(!token) throw Error('Private workshop read token is required');
  const workshopReader=createClient({projectId,dataset:privateDataset,apiVersion,useCdn:false,token});
  await requirePrivateDataset(workshopReader,privateDataset);
  const doc=await workshopReader.fetch('*[_type == "frameWorkshop" && _id == "frame-workshop"][0]',{},{cache:'no-store',perspective:'published'});
  if(!doc) throw Error('Frame workshop is not configured');
  return parseWorkshopDocument(doc);
}
export function parseGalleryDocument(d:{_id:string;title:string;description:string;designJson:string}):DesignTemplate|null {
  try {const design=JSON.parse(d.designJson) as MosaicDesign;validateDesign(design);
    // Reconstruct a public-only DTO. Never spread arbitrary CMS fields.
    const publicDesign:MosaicDesign={version:design.version,algorithm:design.algorithm,size:design.size,cells:[...design.cells],config:{id:design.config.id,version:design.config.version,provisional:design.config.provisional,tileMm:design.config.tileMm,groutMm:design.config.groutMm,frameMm:design.config.frameMm,minCells:design.config.minCells,maxCells:design.config.maxCells,step:design.config.step,backgroundColorId:design.config.backgroundColorId,palette:design.config.palette.map(c=>({id:c.id,name:c.name,hex:c.hex}))}};
    return {id:d._id,title:d.title,description:d.description,published:true,demonstration:false,design:publicDesign};
  } catch{return null;}
}
function sanityCatalog():DesignCatalog {
 let workshop:Promise<FrameWorkshop>|undefined;
 const load=()=>workshop??=loadFrameWorkshop();
 return {configuration:async()=>(await load()).config,pricing:async()=>(await load()).pricing,
  templates:async()=>{const docs=await reader.fetch<Array<{_id:string;title:string;description:string;designJson:string}>>('*[_type == "frameDesign"] | order(order asc, _createdAt desc) {_id,title,description,designJson}',{},{cache:'no-store',perspective:'published'});return docs.flatMap(d=>{const parsed=parseGalleryDocument(d);return parsed?[parsed]:[];});}};
}
function usesSanityWorkshop(){const source=process.env.CUADROS_CATALOG_SOURCE??'fixtures';if(!['fixtures','sanity'].includes(source))throw Error('Invalid frame catalog source');return source==='sanity';}
export function frameDesignCatalog():DesignCatalog{return usesSanityWorkshop()?sanityCatalog():demoDesignCatalog;}
