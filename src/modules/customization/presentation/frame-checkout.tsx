'use client';
import type { PublicFrameEstimate } from "../domain/public-pricing";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ARGENTINE_PROVINCES, parseDeliverySnapshot } from '@/modules/checkout/domain/delivery';
import type { MosaicDesign } from '../domain/design';
import { formatArs } from '../domain/estimate';
import { selectDesign } from '../domain/purchase';
import { FrameReview } from './frame-review';
import { MosaicSvg } from './mosaic-svg';
import styles from './customization.module.css';
export type FrameCheckoutSettings={mode:'sandbox'|'production';terms:{version:string;text:string};productionDays:number};
type Option={id:string;expiresAt:string;frameCents:number;shippingCents:number;totalCents:number;carrier:string;service:string;productionDays:number};
const fields=[['name','Nombre y apellido','name'],['email','Email','email'],['phone','Teléfono','tel'],['document','DNI o documento','off'],['street','Calle','address-line1'],['number','Número','off'],['floor','Piso (opcional)','off'],['apartment','Departamento (opcional)','off'],['city','Localidad','address-level2'],['postalCode','Código postal (4 dígitos)','postal-code']] as const;
class PurchaseError extends Error {constructor(message:string,readonly code:string){super(message);}}
async function request(body:object,signal:AbortSignal,mode:FrameCheckoutSettings['mode']) {
 const r=await fetch('/api/cuadros/compra',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
 const data=await r.json();if(!r.ok)throw new PurchaseError(data.error??'No pudimos completar este paso. Probá de nuevo.',data.code);
 if(data.mode!==mode)throw Error('Invalid checkout mode');return data;
}
export function FrameCheckout({design,estimate,settings,onEdit,navigate=(url)=>window.location.assign(url)}:{design:MosaicDesign;estimate:PublicFrameEstimate;settings:FrameCheckoutSettings;onEdit:()=>void;navigate?:(url:string)=>void}) {
 const [step,setStep]=useState<'review'|'shipping'|'payment'>('review');
 const [address,setAddress]=useState<Record<string,string>>({province:''});
 const [consent,setConsent]=useState(false),[accepted,setAccepted]=useState(false);
 const [options,setOptions]=useState<Option[]>([]),[selected,setSelected]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[attempted,setAttempted]=useState(false);
 const attempt=useRef<string|null>(null), pending=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{heading.current?.focus();},[step]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 const quote=options.find(o=>o.id===selected);
 async function perform(work:(signal:AbortSignal)=>Promise<void>) {
  if(pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{await work(controller.signal);}catch(e){if(!controller.signal.aborted){setError(e instanceof PurchaseError?e.message:'No pudimos confirmar el resultado. Reintentá con el mismo botón para consultar esta compra.');
   if(e instanceof PurchaseError&&['QUOTE_EXPIRED','SHIPPING_QUOTE_EXPIRED','SHIPPING_QUOTE_CHANGED','SHIPPING_RATE_CHANGED','CAPACITY_FULL','RATE_CHANGED','DESIGN_CHANGED'].includes(e.code)){setOptions([]);setStep('shipping');attempt.current=null;setAttempted(false);}
  }}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 function calculate(e:FormEvent) {e.preventDefault();if(!accepted)return;
  let delivery;try{delivery=parseDeliverySnapshot({type:'home',buyerName:address.name,recipientName:address.name,phone:address.phone,recipientDocument:address.document,streetName:address.street,streetNumber:address.number,floor:address.floor??'',apartment:address.apartment??'',city:address.city,provinceCode:address.province,postalCode:address.postalCode});}catch{setError('Revisá los datos del domicilio.');return;}
  void perform(async signal=>{const data=await request({action:'quote',design:selectDesign(design),accepted:true,galleryConsent:consent,termsVersion:settings.terms.version,recipient:{email:address.email,delivery}},signal,settings.mode);if(signal.aborted)return;
    setOptions(data.options);setSelected(data.options[0]?.id??'');attempt.current=null;setAttempted(false);setStep('payment');
  });
 }
 function pay(){if(!quote)return;attempt.current??=crypto.randomUUID();setAttempted(true);
  void perform(async signal=>{const data=await request({action:'pay',quoteId:quote.id,attemptId:attempt.current},signal,settings.mode);if(signal.aborted)return;
    const resultPath=new URL(data.resultUrl,window.location.origin).pathname;
    if(!data.checkoutUrl&&!resultPath.startsWith('/cuadros/resultado/'))throw Error('Invalid result URL');
    const url=new URL(data.checkoutUrl??resultPath,window.location.origin);
    const provider=url.protocol==='https:'&&(url.hostname==='mercadopago.com.ar'||url.hostname.endsWith('.mercadopago.com.ar'));
    if(url.origin!==window.location.origin&&!provider)throw Error('Invalid checkout URL');
    navigate(url.href);
  });
 }
 if(step==='review')return <FrameReview design={design} estimate={estimate} onEdit={onEdit} onContinue={()=>setStep('shipping')} productionDays={settings.productionDays} mode={settings.mode}/>;
 return <div className={styles.page}>
  <button className={styles.backLink} disabled={busy||attempted} onClick={()=>{setError('');setStep(step==='shipping'?'review':'shipping');}}>Volver al {step==='shipping'?'diseño':'domicilio'}</button>
  <div className={styles.pageHeading}><h1 ref={heading} tabIndex={-1}>{step==='shipping'?'Envío de tu cuadro':'Revisá el total'}</h1></div>
  {settings.mode==='sandbox'&&<p className={styles.notice}>Compra sandbox: usá una cuenta y tarjeta de prueba de Mercado Pago. No se cobra dinero ni se encarga un cuadro real.</p>}
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <div className={styles.purchaseLayout} data-step={step}><section className={styles.reviewDetails} aria-busy={busy}>
   {step==='shipping'?<form onSubmit={calculate}>
    <fieldset className={styles.addressFields} disabled={busy}><legend>Datos de entrega</legend>
     {fields.map(([key,label,autoComplete])=><label className={styles.formField} key={key}>{label}<input name={key} value={address[key]??''} onChange={e=>setAddress({...address,[key]:e.target.value})} required={!['floor','apartment'].includes(key)} autoComplete={autoComplete} type={key==='email'?'email':key==='phone'?'tel':'text'} maxLength={key==='email'?254:key==='postalCode'?4:key==='floor'||key==='apartment'?3:100} pattern={key==='postalCode'?'[1-9][0-9]{3}':undefined} inputMode={key==='postalCode'?'numeric':undefined}/></label>)}
     <label className={styles.formField}>Provincia<select name="province" required value={address.province} onChange={e=>setAddress({...address,province:e.target.value})}><option value="">Elegí una provincia</option>{ARGENTINE_PROVINCES.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
    </fieldset>
    <div className={styles.purchaseConsent}><p>{settings.terms.text}</p><label><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>Acepto estas condiciones y el diseño que revisé.</label><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo a Canela a mostrar este mosaico en la galería y ofrecerlo a otras personas. Es opcional.</label></div>
    <button className={styles.primaryButton} disabled={busy||!accepted}>{busy?'Calculando…':'Calcular envío'}</button>
   </form>:<>
    <fieldset disabled={busy||attempted} className={styles.simulationOptions}><legend>Elegí el envío</legend>{options.map(o=><label key={o.id}><input type="radio" name="shipping" checked={selected===o.id} onChange={()=>setSelected(o.id)}/><span><strong>{o.carrier} · {formatArs(o.shippingCents)}</strong><small>{o.service} · Entrega a domicilio</small></span></label>)}</fieldset>
    {quote&&<p className={styles.hint}>Cotización válida hasta las {new Date(quote.expiresAt).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}. Se vuelve a comprobar antes del pago.</p>}
    <button className={styles.primaryButton} disabled={busy||!quote} onClick={pay}>{busy?'Consultando…':attempted?'Reintentar esta compra':settings.mode==='sandbox'?'Ir a Mercado Pago de prueba':'Pagar con Mercado Pago'}</button>
    <p className={styles.hint}>Si la respuesta tarda o falla, reintentá desde acá. Se conserva el mismo pedido para evitar duplicados.</p>
   </>}
  </section><aside className={styles.purchaseSummary} aria-label="Resumen de compra"><MosaicSvg design={design} label="Diseño aceptado para tu cuadro" className={styles.purchaseArt}/><h2>Tu cuadro personalizado</h2>
   <dl className={styles.priceBreakdown}><div><dt>Cuadro con marco</dt><dd>{formatArs(quote?.frameCents??estimate.totalCents)}</dd></div><div><dt>Envío</dt><dd>{quote?formatArs(quote.shippingCents):'Por cotizar'}</dd></div></dl>
   {quote&&<><p className={styles.estimateLabel}>Total · ARS</p><p className={styles.estimateAmount}>{formatArs(quote.totalCents)}</p></>}
   <p>Fabricación estimada: {settings.productionDays} días desde la confirmación del pago, más el tiempo del envío.</p>{settings.mode==='sandbox'&&<p className={styles.hint}>Los valores de esta compra son de ensayo. Las compras reales siguen bloqueadas.</p>}
  </aside></div>
 </div>;
}
