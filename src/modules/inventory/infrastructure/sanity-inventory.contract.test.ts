import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {SanityInventoryDocuments} from './sanity-documents';
import {SanityInventory} from './sanity-inventory';
import {it} from 'vitest';
it.skipIf(process.env.RUN_SANITY_CONTRACT !== '1')('INV real Sanity: concurrent last unit, retries and private paths', async()=>{
process.loadEnvFile('.env.local');
const token=process.env.SANITY_INVENTORY_TOKEN!;
const dataset=process.env.SANITY_INVENTORY_DATASET;
if(dataset!=='inventory_test')throw Error('Dedicated test dataset required');
const base='https://2puxew6b.api.sanity.io/v2025-01-01/data';
const documents=new SanityInventoryDocuments(token,dataset),inventory=new SanityInventory(documents);
const prefix='contract-'+randomUUID(),id=prefix+'-piece',orders=[prefix+'-a',prefix+'-b'];
const product={id,name:'Contract fixture',tone:'unica' as const,price:100};
async function main(){
 try{
 await inventory.save(product,{mutationId:randomUUID(),expectedVersion:0,expectedStock:0,expectedReserved:0,stockOnHand:1,enabled:true,reason:'Isolated contract test'},'contract');
 const results=await Promise.allSettled(orders.map(o=>inventory.reserve(o,'same-cart',[{productId:id,quantity:1}])));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const winner=orders[results.findIndex(r=>r.status==='fulfilled')];
 await inventory.settle(winner,'consumed');await inventory.settle(winner,'consumed');
 const [stock]=await inventory.list([product]);assert.equal(stock.stockOnHand,0);assert.equal(stock.reserved,0);
 const privateId='inventory.'+createHash('sha256').update(id).digest('hex');
 const publicResponse=await fetch(`${base}/doc/${dataset}/${privateId}`);const publicBody=await publicResponse.json();
 assert.ok(!publicBody.documents?.length,'Private balance must not be anonymously visible');
 console.log(JSON.stringify({concurrentLastUnit:true,idempotentConsumption:true,anonymousBalanceHidden:true,stock:0,dataset}));
 }finally{
 const query='*[_type in ["canelaInventory","canelaInventoryChange","canelaReservation"] && (productId == $id || orderId in $orders)]';
 const docs=await documents.query(query,{id,orders});
 if(docs.length){const response=await fetch(`${base}/mutate/${dataset}?visibility=sync`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({mutations:docs.map(d=>({delete:{id:d._id}}))})});assert.ok(response.ok);}
 }
}
await main();
},30000);
