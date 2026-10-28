import { getDatabase } from '@/db/client';
import { paymentEnvironment } from '@/modules/payments/infrastructure/server/payment-environment';
import { PostgresWorkshopRepository } from './postgres/workshop-repository';
import { createClient } from 'next-sanity';
import { apiVersion,dataset,projectId } from '@/sanity/env';
import type { DesignCatalog,DesignTemplate } from '../application/catalog';
import type { FrameWorkshop } from '../domain/workshop';
export { parseWorkshopDocument } from '../domain/workshop-document';
import { validateDesign, type MosaicDesign } from '../domain/design';
import { demoDesignCatalog } from './demo-catalog';
import { demoWorkshop } from './demo-workshop';
const reader=createClient({projectId,dataset,apiVersion,useCdn:false});
export async function loadFrameWorkshop():Promise<FrameWorkshop> {
  if(!usesDatabaseWorkshop()) return demoWorkshop();
  return new PostgresWorkshopRepository(getDatabase(),paymentEnvironment()).published();
}

export function parseGalleryDocument(d:{_id:string;title:string;description:string;designJson:string}):DesignTemplate|null {
  try {const design=JSON.parse(d.designJson) as MosaicDesign;validateDesign(design);
    // Reconstruct a public-only DTO. Never spread arbitrary CMS fields.
    const publicDesign:MosaicDesign={version:design.version,algorithm:design.algorithm,size:design.size,cells:[...design.cells],config:{id:design.config.id,version:design.config.version,provisional:design.config.provisional,tileMm:design.config.tileMm,groutMm:design.config.groutMm,frameMm:design.config.frameMm,minCells:design.config.minCells,maxCells:design.config.maxCells,step:design.config.step,backgroundColorId:design.config.backgroundColorId,palette:design.config.palette.map(c=>({id:c.id,name:c.name,hex:c.hex}))}};
    return {id:d._id,title:d.title,description:d.description,published:true,demonstration:false,design:publicDesign};
  } catch{return null;}
}
function configuredCatalog():DesignCatalog {
 let workshop:Promise<FrameWorkshop>|undefined;
 const load=()=>workshop??=loadFrameWorkshop();
 return {configuration:async()=>(await load()).config,pricing:async()=>(await load()).pricing,
  templates:async()=>{const docs=await reader.fetch<Array<{_id:string;title:string;description:string;designJson:string}>>('*[_type == "frameDesign"] | order(order asc, _createdAt desc) {_id,title,description,designJson}',{},{cache:'no-store',perspective:'published'});return docs.flatMap(d=>{const parsed=parseGalleryDocument(d);return parsed?[parsed]:[];});}};
}
function usesDatabaseWorkshop(){const source=process.env.CUADROS_CATALOG_SOURCE??'fixtures';if((process.env.VERCEL_ENV==='production'||process.env.CUADROS_CHECKOUT_MODE==='production')&&source!=='database')throw Error('Production frames require a private workshop');if(!['fixtures','database'].includes(source))throw Error('Invalid frame catalog source');return source==='database';}
export function frameDesignCatalog():DesignCatalog{return usesDatabaseWorkshop()?configuredCatalog():demoDesignCatalog;}
