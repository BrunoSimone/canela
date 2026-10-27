import { createHash, randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import { parseDeliverySnapshot } from '@/modules/checkout/domain/delivery';
import { createOrderToken, hashOrderToken } from '@/modules/checkout/infrastructure/order-token';
import { startCheckout, PaymentProviderUncertainError } from '@/modules/checkout/application/start-checkout';
import { quoteShipping, ZipnovaCheckoutQuotes, type QuoteShippingDependencies } from '@/modules/shipping/application/quote-shipping';
import type { PaymentOrderGateway } from '@/modules/payments/domain/payment-order';
import { PostgresFrameRepository } from '../infrastructure/postgres/frame-repository';
import { acceptedDesign, framePrice, validateFrameWorkshop, FrameCommerceError, type FrameWorkshop } from '../domain/workshop';
import type { DesignSelection } from '../domain/purchase';
import type { FrameQuote } from '../domain/frame-order';
import type { MosaicDesign } from '../domain/design';

export type FrameShippingDependencies = Omit<QuoteShippingDependencies,'catalog'|'products'|'boxes'|'groupingRules'>;
const fingerprint=(value:unknown)=>createHash('sha256').update(JSON.stringify(value, (_key,v)=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v)).digest('hex');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function shippingForFrame(w:FrameWorkshop,design:MosaicDesign,deps:FrameShippingDependencies):QuoteShippingDependencies {
  const p=w.packages.find(p=>p.maxCells>=design.size)!;
  const price=framePrice(w,design.size);
  return {...deps,boxes:undefined,groupingRules:[],
    products:{findByIds:async()=>[{id:'custom-frame',name:'Cuadro personalizado con marco',priceArs:price/100,sellable:true}]},
    catalog:{findByIds:async()=>[{id:'custom-frame',sellable:true,profile:{...p,productId:'custom-frame',version:1,shipSeparately:true}}]}};
}
export class FrameCommerce {
  private repository:PostgresFrameRepository;
  constructor(private deps:{sql:Sql;workshop:()=>Promise<FrameWorkshop>;shipping:FrameShippingDependencies;payments:PaymentOrderGateway;siteUrl:string;signingSecret:string}) {
    if(deps.shipping.accountMode!=='sandbox') throw new FrameCommerceError('FRAME_SALES_LOCKED','Los cobros reales de cuadros están bloqueados.',503);
    this.repository=new PostgresFrameRepository(deps.sql);
  }
  async quote(raw:Record<string,unknown>):Promise<FrameQuote[]> {
    const w=await this.deps.workshop(); validateFrameWorkshop(w);
    if(raw.accepted!==true || typeof raw.galleryConsent!=='boolean' || raw.termsVersion!==w.terms.version)
      throw new FrameCommerceError('ACCEPTANCE_REQUIRED','Revisá y aceptá el diseño y las condiciones antes de continuar.',422);
    let design:MosaicDesign,recipient;
    try {
      design=acceptedDesign(w,raw.design as DesignSelection);
      const r=raw.recipient as {email:string;delivery:unknown};
      const delivery=parseDeliverySnapshot(r.delivery);
      if(!delivery.phone||!delivery.recipientDocument||typeof r.email!=='string'||r.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) throw Error();
      recipient={email:r.email.trim().toLowerCase(),delivery};
    } catch(e) { if(e instanceof FrameCommerceError) throw e; throw new FrameCommerceError('INVALID_INPUT','Revisá el diseño y los datos de entrega.',422); }
    const rates=await quoteShipping(shippingForFrame(w,design,this.deps.shipping),{destination:recipient.delivery,items:[{productId:'custom-frame',quantity:1}]});
    const snapshot={design,materials:w.materials,priceCents:framePrice(w,design.size),workshopFingerprint:fingerprint(w),productionDays:w.productionDays,capacity:w.capacity,terms:w.terms,acceptance:{at:new Date().toISOString(),gallery:raw.galleryConsent}};
    const quotes:FrameQuote[]=[];
    for(const issued of rates.options) {
      const {token:_,...shipping}=issued; void _;
      const quote={id:randomUUID(),expiresAt:shipping.expiresAt,snapshot,recipient,shipping};
      await this.repository.saveQuote(quote);quotes.push(quote);
    }
    return quotes;
  }
  async pay(raw:Record<string,unknown>) {
    if(!uuid(raw.quoteId)||!uuid(raw.attemptId)) throw new FrameCommerceError('INVALID_INPUT','No pudimos identificar la compra.',422);
    const key=`frame:${raw.attemptId}`, orderToken=createOrderToken(this.deps.signingSecret,key);
    const resultUrl=new URL(`/cuadros/resultado/${orderToken}`,this.deps.siteUrl).href;
    let existing;
    try { existing=await this.repository.existing(key,raw.quoteId); }
    catch(e) {
      if(e instanceof FrameCommerceError && e.code==='ATTEMPT_CLOSED') return {mode:'sandbox' as const,orderToken,resultUrl,checkoutUrl:null,uncertain:false};
      throw e;
    }
    const q=await this.repository.getQuote(raw.quoteId);
    if(!q) throw new FrameCommerceError('QUOTE_EXPIRED','La cotización ya no está disponible.');
    if(!existing) {
      const w=await this.deps.workshop();validateFrameWorkshop(w);
      if(fingerprint(w)!==q.snapshot.workshopFingerprint) throw new FrameCommerceError('DESIGN_CHANGED','Las condiciones del taller cambiaron. Volvé a revisar el cuadro.');
      if(Date.parse(q.expiresAt)<=Date.now()) throw new FrameCommerceError('QUOTE_EXPIRED','La cotización venció. Volvé a calcular el envío.');
      if(q.shipping.accountMode!=='sandbox') throw new FrameCommerceError('FRAME_SALES_LOCKED','La compra está bloqueada.',503);
      await new ZipnovaCheckoutQuotes(shippingForFrame(w,q.snapshot.design,this.deps.shipping)).verifyForCheckout({source:'zipnova',snapshot:q.shipping,amountCents:q.shipping.amountCents,expiresAt:new Date(q.expiresAt)},
        {items:[{productId:'custom-frame',name:'Cuadro personalizado con marco',unitPriceCents:q.snapshot.priceCents,quantity:1}],destination:q.recipient.delivery});
    }
    try {
      const result=await startCheckout({repository:new PostgresFrameRepository(this.deps.sql,q),payments:this.deps.payments},{
        orderId:randomUUID(),environment:'test',orderToken,publicTokenHash:hashOrderToken(orderToken),idempotencyKey:key,
        buyerEmail:q.recipient.email,delivery:q.recipient.delivery,returnUrl:resultUrl,shippingCents:q.shipping.amountCents,shippingSnapshot:q.shipping,
        items:[{productId:'custom-frame',name:'Cuadro personalizado con marco',unitPriceCents:q.snapshot.priceCents,quantity:1}]});
      return {mode:'sandbox' as const,...result,resultUrl};
    } catch(e) {
      if(e instanceof PaymentProviderUncertainError) return {mode:'sandbox' as const,orderToken,resultUrl,checkoutUrl:null,uncertain:true};
      throw e;
    }
  }
}
