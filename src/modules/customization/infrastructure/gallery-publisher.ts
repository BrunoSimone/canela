import { createClient } from 'next-sanity';
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
    const documentId=`frame-design-${frame.galleryId}`;
    if(frame.galleryDraftCreated) return {documentId};
    const source=frame.snapshot.design;
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
export function createGalleryPublisher(sql:Sql) {
  // An explicit sandbox dataset is mandatory for exports of test orders.
  if(process.env.PAYMENT_ENVIRONMENT!=='test'||!process.env.CUADROS_SANITY_TEST_DATASET||process.env.CUADROS_SANITY_TEST_DATASET===dataset) throw new FrameCommerceError('GALLERY_EXPORT_DISABLED','Configurá un dataset de pruebas separado antes de exportar.',503);
  const token=process.env.SANITY_FRAME_WRITE_TOKEN;
  if(!token) throw new FrameCommerceError('GALLERY_EXPORT_DISABLED','Falta el acceso de escritura de la galería.',503);
  return new GalleryPublisher(sql,createClient({projectId,dataset:process.env.CUADROS_SANITY_TEST_DATASET,apiVersion,useCdn:false,token}),'test');
}
