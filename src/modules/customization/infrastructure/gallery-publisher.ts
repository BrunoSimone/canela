import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { CatalogRepository } from '@/modules/catalog/infrastructure/postgres/catalog-repository';
import { createClient } from '@sanity/client';
import type { Sql } from 'postgres';
import { apiVersion,dataset,projectId } from '@/sanity/env';
import { FrameProduction } from './postgres/production';
import { FrameCommerceError } from '../domain/workshop';
import type { MosaicDesign } from '../domain/design';
export interface GalleryDraftWriter {createIfNotExists(doc:{_id:string;_type:'frameDesign';title:string;description:string;order:number;designJson:string}):Promise<unknown>}
export class GalleryPublisher {
  constructor(private sql:Sql,private writer:GalleryDraftWriter,private environment:'test'|'production') {}
  async prepare(id:string,actor:string) {
    const frame=await new FrameProduction(this.sql).get(id);
    if(!frame||!frame.snapshot.acceptance.gallery) throw new FrameCommerceError('GALLERY_NOT_AUTHORIZED','El pedido necesita pago confirmado y autorización del comprador.');
    if(frame.environment!==this.environment) throw new FrameCommerceError('GALLERY_ENVIRONMENT','No se pueden publicar pedidos de prueba en la galería real.');
    if(frame.state!=='ready')throw new FrameCommerceError('GALLERY_NOT_READY','Terminá el cuadro antes de preparar su publicación en la galería.');
    const documentId=`frame-design-${frame.galleryId}`;
    if(frame.galleryDraftCreated) return {documentId};
    const source=frame.productionDesign??frame.snapshot.design;
    // Public material IDs and swatches only. Never publish the private order snapshot.
    const design:MosaicDesign={version:source.version,algorithm:source.algorithm,size:source.size,cells:source.cells,config:source.config};
    await this.writer.createIfNotExists({_id:`drafts.${documentId}`,_type:'frameDesign',title:'Cuadro personalizado',description:'Diseño en venecitas.',order:0,designJson:JSON.stringify(design)});
    await this.sql.begin(async tx=>{
      const result=await tx`UPDATE custom_frame_order SET gallery_draft_created=true WHERE order_id=${id} AND gallery_draft_created=false`;
      if(result.count) await tx`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${id},'gallery_draft_created',${actor})`;
    });
    return {documentId};
  }
}
export function galleryTarget(env:Record<string,string|undefined>,catalogDataset:string):{dataset:string;environment:'test'|'production'} {
  if(env.PAYMENT_ENVIRONMENT==='production')return {dataset:catalogDataset,environment:'production'};
  const testDataset=env.CUADROS_SANITY_TEST_DATASET;
  if(env.PAYMENT_ENVIRONMENT!=='test'||!testDataset||testDataset===catalogDataset||testDataset==='production'||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(testDataset))throw new FrameCommerceError('GALLERY_EXPORT_DISABLED','Configurá un dataset de pruebas separado antes de exportar.',503);
  return {dataset:testDataset,environment:'test'};
}
export function createGalleryPublisher(sql:Sql) {
  if(databaseCatalog()){
    const environment=process.env.PAYMENT_ENVIRONMENT;
    const localTest=environment==='test'&&process.env.CANELA_LOCAL_CATALOG_TESTS==='1'&&process.env.VERCEL_ENV!=='production'&&['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL??'http://invalid').hostname);
    if(environment!=='production'&&!localTest)throw new FrameCommerceError('GALLERY_EXPORT_DISABLED','La galería de prueba requiere una base local separada.',503);
    const repo=new CatalogRepository(sql);
    return new GalleryPublisher(sql,{createIfNotExists:async doc=>{
      const id=doc._id.replace(/^drafts\./,'');
      if(await repo.get(id))return;
      try{return await repo.create('frame',{title:doc.title,description:doc.description,designJson:doc.designJson},'pedido-autorizado',id);}
      catch(error){if(await repo.get(id))return;throw error;}
    }},environment==='production'?'production':'test');
  }
  const target=galleryTarget(process.env,dataset),token=process.env.SANITY_FRAME_WRITE_TOKEN;
  if(!token)throw new FrameCommerceError('GALLERY_EXPORT_DISABLED','Falta el acceso de escritura de la galería.',503);
  return new GalleryPublisher(sql,createClient({projectId,dataset:target.dataset,apiVersion,useCdn:false,token}),target.environment);
}
