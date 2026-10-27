import { isSameOriginAdminRequest } from '@/modules/admin/infrastructure/admin-origin';
import { FrameCommerceError } from '../domain/workshop';
import { DemoPurchaseError } from '../domain/purchase';
import { boundedJson } from './demo-purchase-http';
import type { FrameCommerce } from '../application/frame-commerce';
import { CourierRateChangedError, UnavailableCourierRateError, ShippingRateLimitedError } from '@/modules/shipping/domain/courier-quote';
import { ExpiredShippingQuoteError } from '@/modules/shipping/domain/shipping-quote';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store, private','X-Robots-Tag':'noindex'}});
export function frameCommerceHandler(d:{enabled:()=>boolean;service:()=>FrameCommerce}) {
  return async(request:Request)=>{
    if(!d.enabled())return json({code:'FRAME_SALES_LOCKED',error:'La compra de cuadros todavía no está habilitada.'},403);
    if(request.method!=='POST')return json({code:'METHOD'},405);
    if(!isSameOriginAdminRequest(request))return json({code:'ORIGIN'},403);
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({code:'CONTENT_TYPE'},415);
    try {
      const body=await boundedJson(request);
      if(body.action==='quote') {
        const quotes=await d.service().quote(body);
        return json({mode:'sandbox',options:quotes.map(q=>({id:q.id,expiresAt:q.expiresAt,frameCents:q.snapshot.priceCents,shippingCents:q.shipping.amountCents,totalCents:q.snapshot.priceCents+q.shipping.amountCents,carrier:q.shipping.carrierName,service:q.shipping.serviceName,productionDays:q.snapshot.productionDays}))});
      }
      if(body.action==='pay')return json(await d.service().pay(body));
      return json({code:'INVALID_INPUT'},422);
    } catch(e) {
      if(e instanceof FrameCommerceError||e instanceof DemoPurchaseError)return json({code:e.code,error:e.message},e.status);
      if(e instanceof ExpiredShippingQuoteError)return json({code:'QUOTE_EXPIRED',error:'La cotización venció. Volvé a calcular el envío.'},409);
      if(e instanceof CourierRateChangedError||e instanceof UnavailableCourierRateError)return json({code:'RATE_CHANGED',error:'El envío cambió. Volvé a cotizar para revisar el total.'},409);
      if(e instanceof ShippingRateLimitedError)return json({code:'RATE_LIMIT',error:'Esperá unos minutos antes de volver a cotizar.'},429);
      console.error(JSON.stringify({event:'frame_checkout_failed'}));
      return json({code:'UNAVAILABLE',error:'No pudimos completar este paso. Tu diseño sigue acá.'},503);
    }
  };
}
