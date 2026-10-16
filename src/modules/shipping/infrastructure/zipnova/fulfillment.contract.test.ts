import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { ShipmentRequest } from "../../domain/fulfillment";
import { readShippingConfig } from "../server/shipping-config";
import { ZipnovaFulfillmentClient } from "./fulfillment-client";

const enabled=process.env.RUN_ZIPNOVA_FULFILLMENT_CONTRACT==="1";
(enabled?describe:describe.skip)("Zipnova sandbox fulfillment contract",()=>{
  it("creates at most one synthetic shipment and retrieves its test label",async()=>{
    const config=readShippingConfig();
    expect(config.accountMode).toBe("sandbox");
    expect(config.dispatchType).toBe("carrier_dropoff");
    const path="tmp/zipnova-fulfillment-contract.json";
    await mkdir("tmp",{recursive:true});
    const fetcher:typeof fetch=async(url,options)=>{
      const response=await fetch(url,options);
      if(process.env.ZIPNOVA_CONTRACT_DIAGNOSTICS==="1"){
        const body=await response.clone().json().catch(()=>null);
        const shape=(v:unknown):unknown=>Array.isArray(v)?{array:v.length,first:shape(v[0])}:v&&typeof v==="object"?Object.fromEntries(Object.entries(v).map(([k,val])=>[k,["origin","destination","packages","data","carrier"].includes(k)?shape(val):typeof val])):typeof v;
        console.log(JSON.stringify({method:options?.method??"GET",status:response.status,shape:shape(body)}));
      }
      return response;
    };
    const client=new ZipnovaFulfillmentClient(config,fetcher);
    let request:ShipmentRequest;
    try { request=JSON.parse(await readFile(path,"utf8")); }
    catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
      const parcels=[{weightGrams:1000,heightCm:10,widthCm:20,lengthCm:20,classificationId:"1",items:[{productId:"sandbox-fixture",quantity:1}],groupingRule:null}];
      const destination={city:"Palermo",provinceCode:"C" as const,postalCode:"1425"};
      const rates=await client.quoteShipment({destination,declaredValueCents:3000000,parcels});
      request={orderId:randomUUID(),externalId:`CA-TEST-${randomUUID().replaceAll("-","").slice(0,22)}`,preparationVersion:1,buyerEmail:"canela-sandbox@example.com",
        delivery:{type:"home",buyerName:"Prueba Canela",recipientName:"Prueba Sandbox",recipientDocument:"12345678",phone:"1123456789",streetName:"Avenida Santa Fe",streetNumber:"3000",floor:null,apartment:null,...destination},
        quote:{...rates[0],version:3,provider:"zipnova",accountMode:"sandbox",contextFingerprint:config.contextFingerprint,destination,items:parcels[0].items,cartFingerprint:"a".repeat(64),planFingerprint:"b".repeat(64),parcels,merchandiseCents:3000000,issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()}};
      // Persist BEFORE the remote POST. If it becomes uncertain, subsequent runs only search.
      await writeFile(path,JSON.stringify(request,null,2),{flag:"wx",mode:0o600});
      const remote=await client.create(request);
      await writeFile("tmp/zipnova-fulfillment-created.json",JSON.stringify(remote,null,2),{mode:0o600});
    }
    expect(request.quote.contextFingerprint).toBe(config.contextFingerprint);
    const remote=await client.find(request);
    expect(remote).not.toBeNull();
    const pdf=await client.label(remote!.id);
    expect(pdf).not.toBeNull();
    expect(Buffer.from(pdf!).subarray(0,5).toString()).toBe("%PDF-");
    await writeFile("tmp/zipnova-etiqueta-sandbox.pdf",pdf!,{mode:0o600});
  },60000);
});
