'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import type { PublicFrame } from '../infrastructure/postgres/public-frame';
import { formatArs } from '../domain/estimate';
import { MosaicSvg } from './mosaic-svg';
import styles from './customization.module.css';
const states={verifying:['Estamos confirmando el pago','Guardá este enlace para consultar el pedido. No hace falta pagar otra vez.'],paid:['Pago confirmado','Este es el diseño que quedó guardado para tu cuadro.'],not_completed:['El pago no se completó','No se encargó el cuadro. Podés retomar el diseño y volver a cotizar.'],review_required:['Necesitamos revisar tu pedido','El equipo de Canela tiene que revisar este pago antes de continuar. Guardá el comprobante y no vuelvas a pagar.']} as const;
const production={awaiting_payment:'Esperando el pago',queued:'En la cola del taller',making:'En fabricación',ready:'Cuadro terminado'} as const;
export function FrameResult({publicToken}:{publicToken:string}) {
 const [order,setOrder]=useState<PublicFrame|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [refresh,setRefresh]=useState(0),first=useRef(true);
 useEffect(()=>{
  const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;const started=Date.now();
  async function load(reconcile:boolean) {
   try {
    if(reconcile)await fetch(`/api/orders/${encodeURIComponent(publicToken)}/reconcile`,{method:'POST',signal:abort.signal}).catch(()=>null);
    const r=await fetch(`/api/cuadros/pedido/${encodeURIComponent(publicToken)}`,{cache:'no-store',signal:abort.signal});
    if(!r.ok)throw Error(r.status===404?'No encontramos este pedido. Revisá que el enlace esté completo.':'No pudimos consultar el pedido. Probá de nuevo; no repitas el pago.');
    const data=await r.json() as PublicFrame;if(abort.signal.aborted)return;setOrder(data);setError('');setBusy(false);
    if(data.status==='verifying'&&Date.now()-started<90_000)timer=setTimeout(()=>{if(document.visibilityState==='visible')void load(false);},6000);
   }catch(e){if(!abort.signal.aborted){setError(e instanceof Error?e.message:'No pudimos consultar el pedido.');setBusy(false);}}
  }
  const reconcile=first.current||refresh>0;first.current=false;void load(reconcile);
  return ()=>{abort.abort();clearTimeout(timer);};
 },[publicToken,refresh]);
 return <div className={styles.page}>
  <div className={styles.pageHeading}><h1>{order?states[order.status][0]:busy?'Buscando tu cuadro':'Tu pedido'}</h1></div>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {order&&<><p role="status">{states[order.status][1]}</p>{order.environment==='test'&&<p className={styles.notice}>Pedido sandbox. No se cobró dinero ni se fabricará o despachará un cuadro real.</p>}
  <div className={styles.reviewLayout}><div className={styles.previewWall}><MosaicSvg design={order.design} label="Diseño guardado con tu pedido" className={styles.previewArt}/></div><section className={styles.reviewDetails}>
   <h2>Tu cuadro personalizado</h2><dl className={styles.priceBreakdown}><div><dt>Cuadro con marco</dt><dd>{formatArs(order.frameCents)}</dd></div><div><dt>Envío</dt><dd>{formatArs(order.shippingCents)}</dd></div><div><dt>Total</dt><dd>{formatArs(order.totalCents)}</dd></div></dl>
   {order.status==='paid'&&<><h3>{production[order.production]}</h3><p>Plazo de fabricación indicado: {order.productionDays} días desde la confirmación del pago. El tiempo de envío se suma después.</p></>}
   <p>Guardá este enlace: permite volver a ver el cuadro y consultar el estado del pedido.</p>
  </section></div></>}
  <div className={styles.resultActions}><button className={styles.primaryButton} disabled={busy} onClick={()=>{setBusy(true);setRefresh(r=>r+1);}}>{busy?'Consultando…':'Actualizar estado'}</button>{order?.status==='not_completed'&&<Link className={styles.textButton} href={`/crear-cuadro?reintentar=${encodeURIComponent(publicToken)}`}>Retomar mi diseño</Link>}<Link className={styles.textButton} href="/cuadros">Volver a los cuadros</Link></div>
 </div>;
}
