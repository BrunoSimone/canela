/** Read-only checks. No migrations, network mutations, emails or carrier orders. */
import {createHash} from "node:crypto";
import {readdir,readFile} from "node:fs/promises";
import {createDatabaseClient} from "../src/db/client";
import {readCheckoutConfig} from "../src/modules/checkout/infrastructure/server/checkout-config";
import {readMercadoPagoWebhookConfig} from "../src/modules/payments/infrastructure/server/webhook-config";
import {readOrderMailConfig} from "../src/modules/notifications/infrastructure/mail-config";
import {fulfillmentEnabled} from "../src/modules/shipping/infrastructure/server/fulfillment-service";
import {readInventoryCatalog} from "../src/modules/inventory/infrastructure/inventory-catalog";
import {SanityShippingProfileCatalog} from "../src/modules/shipping/infrastructure/sanity/sanity-shipping-profile-catalog";
import {SanityShippingBoxes} from "../src/modules/shipping/infrastructure/sanity/sanity-shipping-boxes";
import {buildSharedBoxPlan} from "../src/modules/shipping/domain/shared-box-plan";
import {ZIPNOVA_INPUT_CONSTRAINTS} from "../src/modules/shipping/infrastructure/server/shipping-config";
async function main(){
 const checks:{check:string;status:"ok"|"blocked"|"manual"}[]=[];
 const check=(name:string,run:()=>boolean)=>{try{checks.push({check:name,status:run()?"ok":"blocked"});}catch{checks.push({check:name,status:"blocked"});}};
 check("checkout_configuration",()=>readCheckoutConfig().mode!=="disabled");
 check("payment_callbacks",()=>!!readMercadoPagoWebhookConfig());
 check("shipping_creation_gate",()=>fulfillmentEnabled());
 check("order_email_configuration",()=>!!readOrderMailConfig());
 check("worker_secret",()=>!!process.env.NOTIFICATION_WORKER_SECRET&&process.env.NOTIFICATION_WORKER_SECRET.length>=32);
 if(!process.env.DATABASE_URL)checks.push({check:"database_migrations",status:"blocked"});
 else{
  const sql=createDatabaseClient(process.env.DATABASE_URL);
  try{
   const rows=await sql<{name:string;checksum:string}[]>`SELECT name,checksum FROM schema_migration`;
   for(const name of (await readdir("src/db/migrations")).filter(n=>n.endsWith(".sql")).sort()){
    const checksum=createHash("sha256").update(await readFile(`src/db/migrations/${name}`)).digest("hex");
    checks.push({check:`migration:${name}`,status:rows.some(r=>r.name===name&&r.checksum.trim()===checksum)?"ok":"blocked"});
   }
   if(rows.some(r=>r.name==="0010_dispatch_notifications.sql")){
    const [r]=await sql`SELECT count(*) AS total FROM order_notification WHERE state='review' AND environment=${process.env.PAYMENT_ENVIRONMENT??"test"}`;
    checks.push({check:"notifications_need_review",status:Number(r.total)===0?"ok":"blocked"});
   }
   if(rows.some(r=>r.name==="0012_background_job_health.sql")){
    const [health]=await sql`SELECT finished_at > now()-interval '15 minutes' AND review_count=0 AND overdue_count=0 AS healthy FROM background_job_health WHERE name='order_notifications'`;
    checks.push({check:"periodic_worker_recent_and_healthy",status:health?.healthy===true?"ok":"blocked"});
   }
   const inventory=await sql<{product_id:string;stock_on_hand:number;stock_reserved:number;enabled:boolean}[]>`SELECT product_id,stock_on_hand,reserved AS stock_reserved,is_sellable AS enabled FROM inventory_item`;
   const products=await readInventoryCatalog();
   const profiles=await new SanityShippingProfileCatalog().findByIds(products.map(p=>p.id));
   const boxes=await new SanityShippingBoxes().list();
   checks.push({check:"active_shipping_boxes",status:boxes.length>0?"ok":"blocked"});
   const offered=inventory.filter(i=>i.enabled&&i.stock_on_hand>i.stock_reserved);
   checks.push({check:"sellable_inventory_loaded",status:offered.length>0?"ok":"blocked"});
   let incomplete=0;
   for(const item of offered){
    const product=products.find(p=>p.id===item.product_id),shipping=profiles.find(p=>p.id===item.product_id);
    try{
     if(!product||!shipping?.sellable||!shipping.profile||!Number.isFinite(product.price)||product.price<=0||(product.tone==="unica"&&item.stock_on_hand>1))throw Error("INCOMPLETE_PRODUCT");
     buildSharedBoxPlan({items:[{productId:item.product_id,quantity:1}],profiles:[shipping.profile],boxes,constraints:ZIPNOVA_INPUT_CONSTRAINTS});
    }catch{incomplete++;}
   }
   checks.push({check:"offered_products_packable_and_valid",status:offered.length>0&&incomplete===0?"ok":"blocked"});
  }catch{checks.push({check:"database_read",status:"blocked"});}finally{await sql.end();}
 }
 for(const name of ["physical_measurements_and_stock_confirmed","carrier_account_mode_confirmed","dropoff_fragile_goods_and_costs","preparation_times","external_purchase_acceptance","launch_approval"]){checks.push({check:name,status:"manual"});}
 console.log(JSON.stringify({purpose:"read_only_configuration_check_not_launch_approval",mode:process.env.PAYMENT_ENVIRONMENT??"test",checks},null,2));
 if(checks.some(c=>c.status==="blocked"))process.exitCode=1;
}
main().catch(()=>{console.error("Preflight could not complete. No changes were made.");process.exitCode=1;});
