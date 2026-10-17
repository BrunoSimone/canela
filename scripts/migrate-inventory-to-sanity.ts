/** One-way cutover. Never overwrites existing Sanity balances or active reservations. */
import { createHash } from 'node:crypto';
import { createDatabaseClient } from '../src/db/client';
import { readInventoryCatalog } from '../src/modules/inventory/infrastructure/inventory-catalog';
import { SanityInventory } from '../src/modules/inventory/infrastructure/sanity-inventory';
import { SanityInventoryDocuments } from '../src/modules/inventory/infrastructure/sanity-documents';
async function main() {
  const target=process.env.SANITY_INVENTORY_DATASET;
  if(!target || !process.env.DATABASE_URL || process.env.CHECKOUT_MODE!=='disabled' || process.env.SITE_MAINTENANCE_MODE!=='1')throw Error('Close storefront and checkout before migrating');
  if(target==='production' && !process.argv.includes('--production-cutover'))throw Error('Explicit --production-cutover required');
  const sql=createDatabaseClient(process.env.DATABASE_URL);
  try{
    const rows=await sql`SELECT product_id,stock_on_hand,reserved,is_sellable FROM inventory_item ORDER BY product_id`;
    const [active]=await sql`SELECT count(*)::int AS count FROM stock_reservation WHERE status='active'`;
    if(active.count || rows.some(r=>r.reserved!==0))throw Error('Active reservations require explicit reconciliation before cutover');
    const products=await readInventoryCatalog();
    const inventory=new SanityInventory(new SanityInventoryDocuments(process.env.SANITY_INVENTORY_TOKEN??'',target));
    for(const row of rows){
      const product=products.find(p=>p.id===row.product_id);
      if(!product || (product.tone==='unica' && row.stock_on_hand>1) || (product.tone==='encargo' && row.is_sellable))throw Error('Legacy inventory needs correction before migration');
    }
    let migrated=0;
    for(const row of rows){
      const product=products.find(p=>p.id===row.product_id);if(!product)throw Error('Unmapped legacy product');
      const [current]=await inventory.list([product]);
      if(current.version>0){
        if(current.stockOnHand!==row.stock_on_hand||current.reserved!==0||current.enabled!==row.is_sellable)throw Error('Sanity already has different stock; no overwrite allowed');
        continue;
      }
      const h=createHash('sha256').update(`inventory-cutover:${target}:${product.id}`).digest('hex');
      const mutationId=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
      await inventory.save(product,{mutationId,expectedVersion:0,expectedStock:0,expectedReserved:0,stockOnHand:row.stock_on_hand,enabled:row.is_sellable,reason:'Migración de inventario a Sanity'},'inventory-migration');migrated++;
    }
    console.log(JSON.stringify({target,legacyRows:rows.length,migrated,activeReservations:0}));
  }finally{await sql.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
