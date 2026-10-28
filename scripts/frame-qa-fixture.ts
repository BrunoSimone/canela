import { PostgresWorkshopRepository } from '../src/modules/customization/infrastructure/postgres/workshop-repository';
import { workshopDocument } from '../src/modules/customization/domain/workshop-document';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createDatabaseClient } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { FrameCommerce } from '../src/modules/customization/application/frame-commerce';
import { demoWorkshop } from '../src/modules/customization/infrastructure/demo-workshop';
import { demoDesignCatalog } from '../src/modules/customization/infrastructure/demo-catalog';
import { demoRecipient } from '../src/modules/customization/infrastructure/demo-purchase-config';
import { selectDesign } from '../src/modules/customization/domain/purchase';
import { SignedCourierQuoteService } from '../src/modules/shipping/infrastructure/signed-courier-quote';
import { ZIPNOVA_INPUT_CONSTRAINTS } from '../src/modules/shipping/infrastructure/server/shipping-config';
import { DEFAULT_QUOTE_MARGIN } from '../src/modules/shipping/domain/quote-margin';
import { PostgresPaymentConfirmationRepository } from '../src/modules/payments/infrastructure/postgres/payment-confirmation-repository';
import { AdminAuthRepository } from '../src/modules/admin/infrastructure/admin-auth';
import { hashOrderToken } from '../src/modules/checkout/infrastructure/order-token';
async function main() {
const connection=process.env.TEST_DATABASE_URL,output=process.argv[2];
if(!connection||!output)throw Error('TEST_DATABASE_URL y archivo de salida requeridos. Solo QA local.');
const url=new URL(connection);
if(!['localhost','127.0.0.1'].includes(url.hostname)||!/(test|qa|per146)/i.test(url.pathname))throw Error('Usá una base local descartable de QA.');
const sql=createDatabaseClient(connection),secret='isolated-fixture-only-not-a-real-secret-146',siteUrl='http://localhost:3007';
try {
 await runMigrations(sql);
 const environment=process.env.FRAME_QA_ENVIRONMENT==='production'?'production':'test';
 let workshop=await demoWorkshop();
 if(environment==='production'){
  const repo=new PostgresWorkshopRepository(sql,environment),initial=await repo.settings(),doc=workshopDocument(workshop);
  for(const key of Object.keys(doc.confirmations) as Array<keyof typeof doc.confirmations>)doc.confirmations[key]=true;
  doc.termsText='Configuración ficticia de QA local: no se fabrican cuadros ni se usan proveedores reales.';
  await repo.save(initial.version,doc,'publish','qa-local');workshop=await repo.published();
 }
 const service=new FrameCommerce({environment,sql,workshop:async()=>workshop,siteUrl,signingSecret:secret,
  shipping:{accountMode:environment==='test'?'sandbox':'operational',contextFingerprint:'f'.repeat(64),maxParcels:1,marginPolicy:DEFAULT_QUOTE_MARGIN,constraints:ZIPNOVA_INPUT_CONSTRAINTS,issuer:new SignedCourierQuoteService(secret),rates:{quoteShipment:async()=>[{carrierId:1,carrierName:'Correo (fixture)',serviceCode:'standard_delivery',serviceName:'Domicilio',dispatchType:'carrier_dropoff',amountCents:850000,sellerAmountCents:850000}]}},
  payments:{createOrder:async i=>({providerOrderId:`fixture-${i.idempotencyKey}`,externalReference:i.externalReference,totalCents:i.totalCents,currency:'ARS',state:'created',providerStatus:'created',providerStatusDetail:null,checkoutUrl:'https://www.mercadopago.com.ar/fixture-never-open',sellerUserId:'1',applicationId:'2'}),getOrder:async()=>{throw Error('This fixture never calls Mercado Pago');}}});
 const q=(await service.quote({accepted:true,galleryConsent:false,termsVersion:workshop.terms.version,design:selectDesign({...((await demoDesignCatalog.templates())[0].design),config:workshop.config}),recipient:demoRecipient}))[0];
 const checkout=await service.pay({quoteId:q.id,attemptId:randomUUID()});
 const [o]=await sql`SELECT o.id,p.provider_order_id FROM orders o JOIN payment_attempt p ON p.order_id=o.id WHERE o.public_token_hash=${hashOrderToken(checkout.orderToken)}`;
 await new PostgresPaymentConfirmationRepository(sql).apply({orderId:o.id,providerOrderId:o.provider_order_id,state:'approved',providerStatus:'processed',providerStatusDetail:'accredited',webhookDeliveryId:null});
 const secondQuote=(await service.quote({accepted:true,galleryConsent:false,termsVersion:workshop.terms.version,design:selectDesign({...((await demoDesignCatalog.templates())[0].design),config:workshop.config}),recipient:demoRecipient}))[0];
 const retry=await service.pay({quoteId:secondQuote.id,attemptId:randomUUID()});
 const [rejected]=await sql`SELECT o.id,p.provider_order_id FROM orders o JOIN payment_attempt p ON p.order_id=o.id WHERE o.public_token_hash=${hashOrderToken(retry.orderToken)}`;
 await new PostgresPaymentConfirmationRepository(sql).apply({orderId:rejected.id,providerOrderId:rejected.provider_order_id,state:'rejected',providerStatus:'rejected',providerStatusDetail:null,webhookDeliveryId:null});
 const email='qa-frame@example.com';process.env.ADMIN_ALLOWED_EMAILS=email;
 const token=await new AdminAuthRepository(sql).issueLink(email);
 await writeFile(output,JSON.stringify({creatorUrl:`${siteUrl}/crear-cuadro?reintentar=${retry.orderToken}`,loginUrl:`${siteUrl}/admin/acceso?token=${token}`,orderUrl:`${siteUrl}/admin/pedidos/${o.id}`,resultUrl:checkout.resultUrl},null,2),{flag:'wx'});
 console.log('Fixture local listo. No se contactó a Mercado Pago, Zipnova, Sanity ni Resend.');
} finally {await sql.end();}

}
void main().catch(error=>{console.error(error instanceof Error?error.message:"QA setup failed");process.exitCode=1;});
