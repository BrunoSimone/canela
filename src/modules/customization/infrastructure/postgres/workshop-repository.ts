import type { Sql } from 'postgres';
import { FrameCommerceError,requireProductionWorkshop } from '../../domain/workshop';
import { parseWorkshopDocument,workshopDocument,type WorkshopDocument } from '../../domain/workshop-document';
import { demoWorkshop } from '../demo-workshop';
export type WorkshopSettings={version:number;publishedVersion:number|null;document:WorkshopDocument;publishedAt:string|null;environment:'test'|'production'};
export class PostgresWorkshopRepository {
 constructor(private sql:Sql,private environment:'test'|'production'){}
 async settings():Promise<WorkshopSettings>{
  const [row]=await this.sql`SELECT * FROM frame_workshop WHERE environment=${this.environment}`;
  const document:WorkshopDocument=row?.draft??workshopDocument(await demoWorkshop());
  if(!row)document.termsText='';
  return {environment:this.environment,version:row?.version??0,publishedVersion:row?.published_version??null,publishedAt:row?.published_at?.toISOString()??null,document};
 }
 async published(){
  const [row]=await this.sql`SELECT published,published_version FROM frame_workshop WHERE environment=${this.environment}`;
  if(!row?.published)throw new FrameCommerceError('WORKSHOP_PENDING','Estamos preparando las opciones del taller.',503);
  const workshop=parseWorkshopDocument({...row.published,_rev:`workshop-${this.environment}-${row.published_version}`});
  if(this.environment==='production')requireProductionWorkshop(workshop);
  return workshop;
 }
 async save(expectedVersion:number,document:WorkshopDocument,action:'save'|'publish'|'pause',actor:string):Promise<WorkshopSettings>{
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||!isWorkshopDraft(document)||JSON.stringify(document).length>100_000)throw new FrameCommerceError('INVALID_INPUT','Revisá los datos del taller.',422);
  // Drafts may be incomplete. Publishing always validates the entire document.
  if(action==='publish'){
   try{requireProductionWorkshop(parseWorkshopDocument({...document,_rev:'publication-validation'}));}
   catch{throw new FrameCommerceError('WORKSHOP_INVALID','Revisá las medidas, los colores, los precios, los paquetes y todas las confirmaciones antes de publicar.',422);}
  }
  await this.sql.begin(async tx=>{
   await tx`SELECT pg_advisory_xact_lock(148001)`;
   const [row]=await tx`SELECT version FROM frame_workshop WHERE environment=${this.environment} FOR UPDATE`;
   if((row?.version??0)!==expectedVersion)throw new FrameCommerceError('WORKSHOP_CONFLICT','Otra persona guardó cambios. Recargá la configuración antes de continuar.',409);
   const version=expectedVersion+1,payload=tx.json(JSON.parse(JSON.stringify(document)));
   if(!row)await tx`INSERT INTO frame_workshop(environment,draft,version,updated_by) VALUES(${this.environment},${payload},${version},${actor})`;
   else await tx`UPDATE frame_workshop SET draft=${payload},version=${version},updated_at=now(),updated_by=${actor} WHERE environment=${this.environment}`;
   if(action==='publish')await tx`UPDATE frame_workshop SET published=${payload},published_version=${version},published_at=now() WHERE environment=${this.environment}`;
   if(action==='pause')await tx`UPDATE frame_workshop SET published=NULL,published_version=NULL,published_at=NULL WHERE environment=${this.environment}`;
   await tx`INSERT INTO frame_workshop_event(environment,version,action,actor) VALUES(${this.environment},${version},${action},${actor})`;
  });
  return this.settings();
 }
}

function isWorkshopDraft(d:WorkshopDocument):boolean{
 const number=(v:unknown)=>v===null||(typeof v==='number'&&Number.isFinite(v));
 const text=(v:unknown,max=100)=>typeof v==='string'&&v.length<=max;
 try{return !!d&&typeof d==='object'&&!!d.geometry&&!!d.pricing&&!!d.confirmations&&
  ['tileMm','groutMm','frameMm','minCells','maxCells','step'].every(k=>number(d.geometry[k as keyof typeof d.geometry]))&&text(d.geometry.backgroundColorId)&&
  Array.isArray(d.colors)&&d.colors.length<=128&&d.colors.every(c=>text(c.publicId,64)&&text(c.name,80)&&text(c.hex,7)&&text(c.material)&&typeof c.enabled==='boolean')&&
  ['tilePackArs','tilePackQuantity','roundToArs'].every(k=>number(d.pricing[k as keyof typeof d.pricing]))&&Array.isArray(d.pricing.sizes)&&d.pricing.sizes.length<=100&&d.pricing.sizes.every(s=>number(s.cells)&&number(s.laborArs)&&number(s.suppliesArs))&&
  Array.isArray(d.packages)&&d.packages.length<=100&&d.packages.every(p=>number(p.maxCells)&&number(p.weightGrams)&&number(p.widthCm)&&number(p.lengthCm)&&number(p.heightCm)&&text(p.classificationId))&&
  number(d.capacity)&&number(d.productionDays)&&text(d.termsText,6000)&&['geometry','palette','pricing','packaging','production','terms'].every(k=>typeof d.confirmations[k as keyof typeof d.confirmations]==='boolean');
 }catch{return false;}
}
