import { provinceName } from "../../../checkout/domain/delivery";
import { FulfillmentError, type RemoteShipment, type ShipmentGateway, type ShipmentRequest } from "../../domain/fulfillment";
import type { ShipmentQuoteInput } from "../../domain/courier-quote";
import { arsToCents, ZipnovaClient, type ZipnovaConfig } from "./client";

const API="https://api.zipnova.com.ar/v2";
const MAX_RESPONSE_BYTES=8*1024*1024;
export class ZipnovaFulfillmentClient implements ShipmentGateway {
  constructor(private readonly config:ZipnovaConfig,private readonly fetcher:typeof fetch=fetch,private readonly budget:()=>Promise<void>=async()=>{}) {}
  async quoteShipment(input:ShipmentQuoteInput) { await this.budget(); return new ZipnovaClient(this.config,this.fetcher).quoteShipment(input); }
  async create(input:ShipmentRequest):Promise<RemoteShipment> {
    const d=input.delivery,q=input.quote;
    const response=await this.request("/shipments",{method:"POST",body:JSON.stringify({
      account_id:this.config.accountId,origin_id:this.config.originId,external_id:input.externalId,source:"canela",
      service_type:q.serviceCode,logistic_type:q.dispatchType,carrier_id:q.carrierId,declared_value:q.merchandiseCents/100,process_immediately:1,
      destination:{name:d.recipientName,document:d.recipientDocument,email:input.buyerEmail,phone:d.phone,
        street:d.streetName,street_number:d.streetNumber,street_extras:[d.floor,d.apartment].filter(Boolean).join(" "),
        city:d.city,state:d.provinceCode==="C"?"Ciudad de Buenos Aires":provinceName(d.provinceCode),zipcode:d.postalCode},
      packages:q.parcels.map(p=>({weight:p.weightGrams,height:p.heightCm,width:p.widthCm,length:p.lengthCm,classification_id:p.classificationId,description_1:"Pedido Canela"})),
    })});
    if (!response.ok) throw new FulfillmentError("SHIPMENT_PROVIDER_UNAVAILABLE",503);
    return this.parse(await json(response),input);
  }
  async find(input:ShipmentRequest):Promise<RemoteShipment|null> {
    const response=await this.request(`/shipments?account_id=${this.config.accountId}&external_id=${encodeURIComponent(input.externalId)}`);
    if (!response.ok) throw new FulfillmentError("SHIPMENT_PROVIDER_UNAVAILABLE",503);
    const body=await json(response);
    if (!isRecord(body) || !Array.isArray(body.data)) throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);
    const matches=body.data.filter(row=>isRecord(row)&&row.external_id===input.externalId&&row.account_id===this.config.accountId);
    if (matches.length===0) return null;
    if (matches.length!==1 || !isRecord(matches[0]) || !positiveId(matches[0].id)) throw new FulfillmentError("SHIPMENT_REMOTE_CONFLICT");
    const detail=await this.request(`/shipments/${matches[0].id}`);
    if (!detail.ok) throw new FulfillmentError("SHIPMENT_PROVIDER_UNAVAILABLE",503);
    return this.parse(await json(detail),input);
  }
  async label(id:number):Promise<Uint8Array|null> {
    if (!positiveId(id)) throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);
    const response=await this.request(`/shipments/${id}/label.pdf?no_status_change=1`);
    if (response.status===409 || response.status===400) return null;
    if (!response.ok) throw new FulfillmentError("SHIPMENT_LABEL_UNAVAILABLE",503);
    const body=await json(response);
    if (!isRecord(body) || typeof body.body!=="string" || body.format!=="pdf") throw new FulfillmentError("SHIPMENT_INVALID_LABEL",503);
    const bytes=Buffer.from(body.body,"base64");
    if (bytes.length<5 || bytes.length>5*1024*1024 || bytes.subarray(0,5).toString()!=="%PDF-") throw new FulfillmentError("SHIPMENT_INVALID_LABEL",503);
    return bytes;
  }
  private async request(path:string,init:RequestInit={}) {
    await this.budget();
    return this.fetcher(`${API}${path}`,{...init,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15000),headers:{
      Accept:"application/json","Content-Type":"application/json",Authorization:`Basic ${Buffer.from(`${this.config.apiToken}:${this.config.apiSecret}`).toString("base64")}`,
    }});
  }
  private parse(raw:unknown,input:ShipmentRequest):RemoteShipment {
    const body=isRecord(raw)&&isRecord(raw.data)?raw.data:raw;
    const q=input.quote;
    if (!isRecord(body)||!positiveId(body.id)||body.account_id!==this.config.accountId||body.external_id!==input.externalId||
        !isRecord(body.origin)||body.origin.id!==this.config.originId||!isRecord(body.carrier)||body.carrier.id!==q.carrierId||
        body.logistic_type!==q.dispatchType||body.service_type!==q.serviceCode||typeof body.status!=="string"||
        !isRecord(body.destination)||body.destination.zipcode!==input.delivery.postalCode||body.destination.document!==input.delivery.recipientDocument||
        body.destination.street_number!==input.delivery.streetNumber||
        arsToCents(body.declared_value)!==q.merchandiseCents||!Array.isArray(body.packages)||body.packages.length!==q.parcels.length) {
      throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);
    }
    const dims=(p:Record<string,unknown>)=>[p.weight,p.height,p.width,p.length].join(":");
    if (JSON.stringify(body.packages.map(p=>isRecord(p)?dims(p):"invalid").sort())!==
        JSON.stringify(q.parcels.map(p=>[p.weightGrams,p.heightCm,p.widthCm,p.lengthCm].join(":")).sort())) throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);
    return {id:body.id as number,externalId:input.externalId,status:body.status,
      trackingNumber:typeof body.carrier_tracking_id==="string"?body.carrier_tracking_id:null,
      trackingUrl:safeTrackingUrl(body.tracking_external)??safeTrackingUrl(body.tracking),amountCents:arsToCents(body.price_incl_tax)};
  }
}
export function safeTrackingUrl(value:unknown):string|null {
  if (typeof value!=="string"||value.length>2048) return null;
  try { const u=new URL(value); return u.protocol==="https:"&&!u.username&&!u.password?u.href:null; } catch {return null;}
}
function isRecord(v:unknown):v is Record<string,unknown> {return !!v&&typeof v==="object"&&!Array.isArray(v);}
function positiveId(v:unknown) {return Number.isSafeInteger(v)&&(v as number)>0;}
async function json(response:Response):Promise<unknown> {
  const reader=response.body?.getReader(); if (!reader) throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);
  const chunks:Uint8Array[]=[];let size=0;
  for (;;) {const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_RESPONSE_BYTES){await reader.cancel();throw new FulfillmentError("SHIPMENT_INVALID_RESPONSE",503);}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
