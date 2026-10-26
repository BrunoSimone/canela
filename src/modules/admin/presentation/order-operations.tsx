"use client";
import { useState } from "react";
import type { AdminOrder } from "../domain/order";
import { ReviewBadge, ReviewNotice } from "./review-notice";
import styles from "./admin.module.css";
const states={pending:"Pendiente de envío",sending:"En proceso",sent:"Aceptado por Resend"};
export function OrderOperations({order,onChanged}:{order:AdminOrder;onChanged:(order:AdminOrder)=>void}){
 const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 const canDispatch=order.source!=="demo"&&order.shipmentEnabled&&order.status==="label_ready"&&!order.dispatch;
 async function run(action:"dispatch"|"notifications"){
  if(busy)return;setBusy(true);setMessage(null);
  try{
   const response=await fetch(`/api/admin/orders/${order.id}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="dispatch"?{confirmHandedOver:confirmed,expectedRemoteId:order.shipment?.remoteId}:{action:"retry"})});
   if(!response.ok){setMessage("No se pudo completar la acción. Actualizá el pedido y revisá su estado antes de continuar.");return;}
   await refresh();setConfirmed(false);
   if(action==="notifications")setMessage("Consulta completada. Los avisos pendientes respetan el tiempo de espera entre intentos.");
  }catch{setMessage("La respuesta no llegó. Actualizá el pedido para comprobar si la acción quedó registrada.");}finally{setBusy(false);}
 }
 async function refresh(){const response=await fetch(`/api/admin/orders/${order.id}`,{cache:"no-store"});if(!response.ok)throw Error();onChanged(await response.json());}
 return <section id="despacho-y-avisos" className={`${styles.detailCard} ${styles.operationsCard}`}>
  <h2>Despacho y avisos</h2>
  {order.dispatch?<p className={styles.integrationNote}>{order.shipment?.sandbox?"Despacho simulado":"Entrega al transporte registrada"} el {new Date(order.dispatch.dispatchedAt).toLocaleString("es-AR")} por {order.dispatch.dispatchedBy}.</p>:
    canDispatch?<>
      <p className={styles.integrationNote}>{order.shipment?.sandbox?"Esta acción simula la entrega al transporte y prepara un aviso de prueba.":"Registrá este paso después de entregar físicamente el paquete al transporte. Se preparará el aviso al comprador."}</p>
      <label className={styles.dispatchConfirmation}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/>{order.shipment?.sandbox?"Confirmo que quiero simular el despacho":"Confirmo que entregué el paquete al transporte"}</label>
      <button className={styles.primaryLink} disabled={!confirmed||busy} onClick={()=>run("dispatch")}>{busy?"Guardando…":order.shipment?.sandbox?"Simular despacho":"Registrar despacho"}</button>
    </>:<p className={styles.integrationNote}>El despacho se confirma cuando el pedido pagado tiene su etiqueta lista.</p>}
  {!!order.notifications?.length&&<>
    <ul className={styles.noticeList}>{order.notifications.map(n=><li key={n.kind}><strong>{n.kind==="owner_paid"?"Compra pagada · taller":"Despacho · comprador"}</strong>{n.state==="review"?<ReviewBadge/>:<span>{states[n.state]}</span>}</li>)}</ul>
    <p className={styles.integrationNote}>{order.notificationsEnabled?"La aceptación del correo confirma que Resend recibió el mensaje; no garantiza su entrega en la bandeja.":"El envío de avisos está desactivado o falta completar su configuración. Los mensajes quedan guardados."}</p>
    {order.notificationsEnabled&&order.notifications.some(n=>n.state==="pending"||n.state==="sending")&&<button className={styles.textButton} disabled={busy} onClick={()=>run("notifications")}>Consultar y reintentar avisos pendientes</button>}
    {order.notifications.some(n=>n.state==="review")&&<ReviewNotice><p>Pedí ayuda técnica con el ID de este pedido para comprobar qué pasó con el correo. No se reenviará automáticamente; evitá enviar otra copia hasta revisarlo.</p></ReviewNotice>}
    <button className={styles.textButton} disabled={busy} onClick={()=>refresh().catch(()=>setMessage("No pudimos actualizar el pedido."))}>Actualizar estado</button>
  </>}
  {message&&<p role="status" className={styles.integrationNote}>{message}</p>}
 </section>;
}
