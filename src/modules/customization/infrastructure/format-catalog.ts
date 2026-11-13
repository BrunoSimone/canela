import type { DesignCatalog } from '../application/catalog';
import type { FrameFormat } from '../domain/formats';
import { adaptTemplate } from '../domain/formats';
import { previewWorkshop } from './format-options';
import { demoDesignCatalog } from './demo-catalog';
export function previewCatalog(format:FrameFormat):DesignCatalog{
 const load=previewWorkshop(format);
 return {configuration:async()=>(await load).config,pricing:async()=>(await load).pricing,templates:async()=>{
  const config=(await load).config;
  return (await demoDesignCatalog.templates()).map(t=>({...t,design:adaptTemplate(t.design,config,t.design.size)}));
 }};
}
