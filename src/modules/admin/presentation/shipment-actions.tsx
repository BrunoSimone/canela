"use client";
import { useState } from "react";
import type { AdminOrder } from "../domain/order";
import { ReviewNotice } from "./review-notice";
import styles from "./admin.module.css";

const messages:Record<string,string>={
  SHIPMENT_PAYMENT_REQUIRED:"El pago debe estar confirmado antes de crear el envío.",
  SHIPMENT_PREPARATION_CHANGED:"La preparación cambió. Recargá el pedido antes de continuar.",
  SHIPMENT_CONTEXT_CHANGED:"Este pedido corresponde a otra configuración de envíos y requiere revisión.",
  SHIPMENT_RECIPIENT_INCOMPLETE:"Faltan datos del destinatario para crear el envío. Revisá el pedido.",
  SHIPMENT_PACKAGING_CHANGED:"El embalaje preparado difiere del cotizado o requiere más de un bulto. Revisalo antes de despachar.",
  SHIPMENT_RATE_CHANGED:"El costo de envío cambió. No se creó el envío ni se cobró una diferencia al comprador.",
  SHIPMENT_APPROVAL_EXPIRED:"La confirmación venció o no es válida. Consultá el costo nuevamente.",
  SHIPMENT_DISABLED:"La generación de etiquetas no está habilitada en este entorno.",
};
export function ShipmentActions({order,onChanged}:{order:AdminOrder;onChanged:(order:AdminOrder)=>void}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
  const [preview,setPreview]=useState<{quoteToken:string;sellerAmountCents:number;customerPaidCents:number;differenceCents:number}|null>(null);
  const [accepted,setAccepted]=useState(false);
  const money=(cents:number)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(cents/100);
  const shipment=order.shipment;
  async function run(action:"confirm"|"refresh"|"preview"){
    if(busy)return;setBusy(true);setMessage(null);
    try{
      const response=await fetch(`/api/admin/orders/${order.id}/shipment`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({action,expectedPreparationVersion:order.preparation?.version,...(action==="confirm"&&preview?{approvedQuoteToken:preview.quoteToken}:{})}),cache:"no-store"});
      const body=await response.json();
      if(!response.ok){setMessage(messages[body.code]??"No pudimos completar la operación. Intentá consultar el estado nuevamente.");return;}
      if(action==="preview"){setPreview(body);setAccepted(false);return;}
      const refreshed=await fetch(`/api/admin/orders/${order.id}`,{cache:"no-store"});
      if(!refreshed.ok)throw new Error();onChanged(await refreshed.json());
    }catch{setMessage("La respuesta no llegó. Consultá el pedido antes de volver a operar; el envío puede haberse creado.");}
    finally{setBusy(false);}
  }
  return <section className={styles.detailCard}>
    <h2>Envío y etiqueta</h2>
    {order.source==="demo"?<p className={styles.integrationNote}>La demostración no crea envíos.</p>:<>
      {(shipment?.sandbox || (order.shipmentEnabled && order.environment === "test"))&&<p className={styles.integrationNote}>Modo de pruebas: las etiquetas no sirven para despachar y el transporte no recibe estos envíos.</p>}
      {shipment?.state==="label_ready"?<>
        <p className={styles.integrationNote}>{order.dispatch?"Conservá la etiqueta del envío como referencia.":"La etiqueta está lista. Generarla no significa que el paquete haya sido despachado."}</p>
        <a className={styles.primaryLink} href={`/api/admin/orders/${order.id}/shipment/label`}>Descargar etiqueta PDF</a>
      </>:shipment?<>
        {shipment.state==="review"
          ? <ReviewNotice><p>Pedí ayuda técnica con el ID de este pedido para comprobar el envío en Zipnova. No generes otro envío hasta resolver este caso.</p></ReviewNotice>
          : <p className={styles.integrationNote}>{shipment.state==="uncertain"?"Consultá si Zipnova recibió el envío. La consulta no crea uno nuevo.":"El envío está en proceso. Consultá si la etiqueta ya está disponible."}</p>}
        {order.shipmentEnabled&&shipment.state!=="review"&&<button className={styles.primaryLink} disabled={busy} onClick={()=>run("refresh")}>{busy?"Consultando…":"Consultar envío y etiqueta"}</button>}
      </>:order.shipmentEnabled&&order.preparation&&order.status==="ready_to_ship"?<>
        <p className={styles.integrationNote}>Confirmá que el paquete está embalado y las medidas guardadas son las reales. Canela verificará la tarifa y solicitará la etiqueta.</p>
        <button className={styles.primaryLink} disabled={busy} onClick={()=>{setPreview(null);setAccepted(false);void run("preview");}}>{busy?"Consultando…":"Consultar costo del paquete preparado"}</button>
        {preview&&<div>
          <p>Costo de envío para Canela: <strong>{money(preview.sellerAmountCents)}</strong>. Cobrado al comprador: {money(preview.customerPaidCents)}.</p>
          {preview.differenceCents>0&&<p>Canela absorbe una diferencia de {money(preview.differenceCents)}. El comprador no recibirá un cobro adicional.</p>}
          <label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Confirmo el embalaje real y acepto este costo de envío para Canela.</label>
          <button className={styles.primaryLink} disabled={busy||!accepted} onClick={()=>run("confirm")}>{busy?"Generando etiqueta…":"Generar etiqueta con este costo"}</button>
        </div>}
      </>:<p className={styles.integrationNote}>{order.shipmentEnabled?"Guardá la preparación del pedido pagado para continuar.":"La generación de etiquetas todavía no está habilitada en este entorno."}</p>}
      {shipment?.trackingNumber&&<p className={styles.integrationNote}>Seguimiento: {shipment.trackingNumber}</p>}
      {shipment?.trackingUrl&&<p className={styles.integrationNote}><a className={styles.textButton} href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Ver seguimiento del transporte</a></p>}
    </>}
    {message&&<p role="alert" className={styles.integrationNote}>{message}</p>}
  </section>;
}
