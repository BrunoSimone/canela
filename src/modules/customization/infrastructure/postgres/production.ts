import { validateDesign,type MosaicDesign } from '../../domain/design';
import type { Sql } from 'postgres';
import type { FrameSnapshot, ProductionState } from '../../domain/frame-order';
import { FrameCommerceError } from '../../domain/workshop';
export class FrameProduction {
  constructor(private sql:Sql) {}
  async get(id:string):Promise<{snapshot:FrameSnapshot;productionDesign:MosaicDesign|null;state:ProductionState;version:number;environment:string;galleryId:string;galleryDraftCreated:boolean}|null> {
    const [r]=await this.sql`SELECT c.*,o.environment,o.status FROM custom_frame_order c JOIN orders o ON o.id=c.order_id WHERE c.order_id=${id}`;
    if(!r || !['paid','fulfillment_pending','shipped','delivered'].includes(r.status) || !['consumed','completed'].includes(r.reservation_state)) return null;
    return {snapshot:r.snapshot,productionDesign:r.production_cells?{...r.snapshot.design,cells:r.production_cells}:null,state:r.production_state,version:r.version,environment:r.environment,galleryId:r.gallery_id,galleryDraftCreated:r.gallery_draft_created};
  }
  async retouch(id:string,expectedVersion:number,cells:unknown,actor:string){
    if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1||!Array.isArray(cells)||cells.length>10000)throw new FrameCommerceError('INVALID_DESIGN','Revisá las venecitas del cuadro.',422);
    return this.sql.begin(async tx=>{
      const [o]=await tx`SELECT status FROM orders WHERE id=${id} FOR UPDATE`;
      const [r]=await tx`SELECT * FROM custom_frame_order WHERE order_id=${id} FOR UPDATE`;
      if(!o||!r||o.status!=='paid'||r.reservation_state!=='consumed'||!['queued','making'].includes(r.production_state)||r.gallery_draft_created)throw new FrameCommerceError('PRODUCTION_NOT_ALLOWED','Solo se retocan cuadros pagos que todavía no están terminados ni exportados a la galería.');
      if(r.version!==expectedVersion)throw new FrameCommerceError('PRODUCTION_CONFLICT','El pedido cambió. Actualizá la ficha antes de guardar.');
      const original=(r.snapshot as FrameSnapshot).design;
      try{validateDesign({...original,cells});}catch{throw new FrameCommerceError('INVALID_DESIGN','Usá solo los colores y la grilla del pedido.',422);}
      const current=r.production_cells??original.cells;
      if(cells.every((color,i)=>color===current[i]))return;
      await tx`UPDATE custom_frame_order SET production_cells=${tx.json(cells)},version=version+1,updated_at=now(),updated_by=${actor} WHERE order_id=${id}`;
      await tx`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${id},'retouched',${actor})`;
      await tx`UPDATE orders SET updated_at=now() WHERE id=${id}`;
    });
  }
  async advance(id:string,expectedVersion:number,state:'making'|'ready',actor:string) {
    return this.sql.begin(async tx=>{
      const [o]=await tx`SELECT status FROM orders WHERE id=${id} FOR UPDATE`;
      const [r]=await tx`SELECT * FROM custom_frame_order WHERE order_id=${id} FOR UPDATE`;
      if(!o || !r || o.status!=='paid' || r.reservation_state!=='consumed') throw new FrameCommerceError('PRODUCTION_NOT_ALLOWED','Este cuadro todavía no se puede fabricar.');
      if(r.version!==expectedVersion) throw new FrameCommerceError('PRODUCTION_CONFLICT','El pedido cambió. Actualizá la ficha.');
      if(!((r.production_state==='queued'&&state==='making')||(r.production_state==='making'&&state==='ready'))) throw new FrameCommerceError('PRODUCTION_TRANSITION','Revisá el estado de fabricación.');
      await tx`UPDATE custom_frame_order SET production_state=${state},reservation_state=${state==='ready'?'completed':'consumed'},version=version+1,updated_at=now(),updated_by=${actor} WHERE order_id=${id}`;
      await tx`INSERT INTO custom_frame_event(order_id,event,actor) VALUES(${id},${state},${actor})`;
      await tx`UPDATE orders SET updated_at=now() WHERE id=${id}`;
    });
  }
}
