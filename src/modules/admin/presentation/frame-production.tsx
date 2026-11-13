'use client';
import { FrameRetouch } from './frame-retouch';
import { useRef,useState } from 'react';
import type { AdminOrder } from '../domain/order';
import { MosaicSvg } from '@/modules/customization/presentation/mosaic-svg';
import styles from './admin.module.css';
export function FrameProductionPanel({order,onChanged}:{order:AdminOrder;onChanged:(o:AdminOrder)=>void}) {
 const [editing,setEditing]=useState(false);const editButton=useRef<HTMLButtonElement>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const frame=order.frame;if(!frame?.design)return null;const design=frame.productionDesign??frame.design;
 const paid=frame.state!=='awaiting_payment'&&!['attention','cancelled','payment_verification'].includes(order.status);
 async function action(body:object) {if(busy)return;setBusy(true);setError('');try{
   const r=await fetch(`/api/admin/orders/${order.id}/frame`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error??'No pudimos guardar el cambio. Actualizá la ficha.');
   if(data.documentId){setMessage('Borrador preparado en el catálogo de cuadros. Revisá el título antes de publicarlo.');onChanged({...order,frame:{...order.frame!,galleryDraftCreated:true}});}else onChanged({...order,...data});
 }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar.');}finally{setBusy(false);}}
 return <section className={`${styles.detailCard} ${styles.frameCard}`} aria-label="Fabricación del cuadro"><h2>Cuadro personalizado</h2>
   <MosaicSvg design={design} label={frame.productionDesign?"Diseño de fabricación":"Diseño aceptado por el comprador"} className={styles.framePreview}/>
   <p>{design.size} × {design.size} venecitas · Plazo indicado: {frame.productionDays} días desde el pago.</p>
   {order.environment==='test'&&<p className={styles.integrationNote}>Pedido de prueba. No fabricar ni despachar.</p>}
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
   {!paid&&<button className={styles.primaryLink} disabled={busy||order.source==='demo'} onClick={()=>void action({action:'reconcile'})}>{busy?'Consultando…':'Consultar pago en Mercado Pago'}</button>}
   {paid&&['queued','making'].includes(frame.state)&&!frame.galleryDraftCreated&&<><button ref={editButton} className={styles.textButton} disabled={busy||order.source==='demo'} onClick={()=>setEditing(true)}>Retocar venecitas</button><p>Los retoques se guardan para fabricar. El diseño aceptado y el importe del pedido se conservan.</p></>}
   {editing&&<FrameRetouch order={order} returnFocus={editButton} onCancel={()=>setEditing(false)} onSaved={next=>{setEditing(false);setMessage('Retoques guardados. La guía de armado usa esta versión.');onChanged(next);}}/>}
   {paid&&<a className={styles.textButton} href={`/api/admin/orders/${order.id}/frame/guide`} target="_blank" rel="noopener noreferrer">Abrir guía privada de armado / imprimir PDF</a>}
   {paid&&frame.state==='queued'&&<button className={styles.primaryLink} disabled={busy||order.source==='demo'} onClick={()=>void action({version:frame.version,state:'making'})}>Iniciar fabricación</button>}
   {paid&&frame.state==='making'&&<button className={styles.primaryLink} disabled={busy||order.source==='demo'} onClick={()=>void action({version:frame.version,state:'ready'})}>Marcar cuadro terminado</button>}
   {frame.state==='ready'&&<p>Cuadro terminado. Podés confirmar el embalaje y preparar el envío.</p>}
   {paid&&frame.galleryConsent?<><p>El comprador autorizó mostrar y reutilizar el diseño. {frame.state!=='ready'?'Podés preparar el borrador cuando el cuadro esté terminado.':''}</p><button className={styles.textButton} disabled={busy||frame.state!=='ready'||frame.galleryDraftCreated||order.source==='demo'} onClick={()=>void action({action:'gallery'})}>{frame.galleryDraftCreated?'Borrador de galería preparado':'Preparar borrador para la galería'}</button></>:<p>Este diseño no tiene autorización para publicarse en la galería.</p>}
 </section>;
}
