import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createDatabaseClient} from '../src/db/client';
import {runMigrations} from '../src/db/migrate';
import {FrameCommerce} from '../src/modules/customization/application/frame-commerce';
import {previewWorkshop} from '../src/modules/customization/infrastructure/format-options';
import {FRAME_FORMATS} from '../src/modules/customization/domain/formats';
import {renderMosaic} from '../src/modules/customization/domain/design';
import {selectDesign} from '../src/modules/customization/domain/purchase';
import {demoRecipient} from '../src/modules/customization/infrastructure/demo-purchase-config';
import {SignedCourierQuoteService} from '../src/modules/shipping/infrastructure/signed-courier-quote';
import {ZIPNOVA_INPUT_CONSTRAINTS} from '../src/modules/shipping/infrastructure/server/shipping-config';
import {DEFAULT_QUOTE_MARGIN} from '../src/modules/shipping/domain/quote-margin';
import {PostgresPaymentConfirmationRepository} from '../src/modules/payments/infrastructure/postgres/payment-confirmation-repository';
import {PostgresInventory} from '../src/modules/inventory/infrastructure/postgres-inventory';
async function main(){
 const url=process.env.DATABASE_URL;if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith('_stage'))throw Error('Local disposable stage required');
 const sql=createDatabaseClient(url),secret='local-frame-qa-'.repeat(4),result=[];
 try{
  await runMigrations(sql);
  for(const format of FRAME_FORMATS){
   const w=await previewWorkshop(format);
   const commerce=new FrameCommerce({sql,environment:'test',workshop:async()=>w,shipping:{rates:{quoteShipment:async()=>[{carrierId:1,carrierName:'Transporte ficticio',serviceCode:'standard_delivery',serviceName:'Prueba local',dispatchType:'carrier_dropoff',amountCents:10000,sellerAmountCents:10000}]},issuer:new SignedCourierQuoteService(secret),accountMode:'sandbox',contextFingerprint:'f'.repeat(64),constraints:ZIPNOVA_INPUT_CONSTRAINTS,maxParcels:1,marginPolicy:DEFAULT_QUOTE_MARGIN},payments:{createOrder:async i=>({providerOrderId:`local-qa-${randomUUID()}`,externalReference:i.externalReference,state:'created',providerStatus:'created',providerStatusDetail:null,totalCents:i.totalCents,currency:'ARS',checkoutUrl:'https://mercadopago.test/pay',sellerUserId:'1',applicationId:'2'}),getOrder:async()=>{throw Error('No external gateway in QA');}},siteUrl:'http://localhost:3000',signingSecret:secret});
   const size=30,data=new Uint8ClampedArray(size*size*4);
   for(let i=0;i<data.length;i+=4)data.set([15,140,210,255],i);
   const design=renderMosaic({width:size,height:size,data},w.config,size);
   const q=(await commerce.quote({format,accepted:true,galleryConsent:false,termsVersion:w.terms.version,design:selectDesign(design),recipient:demoRecipient}))[0];
   await commerce.pay({quoteId:q.id,attemptId:randomUUID()});
   const [order]=await sql`SELECT order_id FROM custom_frame_order WHERE quote_id=${q.id}`;
   const [attempt]=await sql`SELECT provider_order_id FROM payment_attempt WHERE order_id=${order.order_id}`;
   await new PostgresPaymentConfirmationRepository(sql,new PostgresInventory(sql)).apply({orderId:order.order_id,providerOrderId:attempt.provider_order_id,state:'approved',providerStatus:'approved',providerStatusDetail:null,webhookDeliveryId:randomUUID()});
   result.push({format,path:`/admin/pedidos/${order.order_id}`,note:'Prueba local con proveedores simulados; no fabricar ni despachar.'});
  }
  await writeFile('output/catalog-migration/local-frame-qa.json',JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify(result));
 }finally{await sql.end();}
}
main().catch(()=>{console.error('Local frame QA could not be prepared');process.exitCode=1;});
