import { randomUUID } from "node:crypto";
import type { ShipmentOrder, ShipmentRecord, ShipmentRequest } from "../domain/fulfillment";
import { testDelivery } from "../../checkout/domain/delivery.test-fixture";
import { quoteFixture } from "./fixtures";
export async function fulfillmentFixture(){
  const {snapshot}=await quoteFixture();
  const quote={...snapshot,accountMode:"sandbox" as const,parcels:[snapshot.parcels[0]],items:[{productId:"piece",quantity:1}]};
  const delivery={...testDelivery,...quote.destination,recipientDocument:"12345678"};
  const order:ShipmentOrder={id:randomUUID(),status:"paid",currency:"ARS",buyerEmail:"buyer@example.com",subtotalCents:quote.merchandiseCents,shippingCents:quote.amountCents,
    delivery,quote,preparation:{version:1,parcels:quote.parcels.map(({weightGrams,heightCm,widthCm,lengthCm})=>({weightGrams,heightCm,widthCm,lengthCm})),note:null,updatedBy:"owner@example.com",updatedAt:new Date().toISOString()}};
  const request:ShipmentRequest={orderId:order.id,externalId:"CA-test",preparationVersion:1,buyerEmail:order.buyerEmail,delivery,quote};
  const record:ShipmentRecord={orderId:order.id,externalId:request.externalId,request,state:"creating",remote:null,lastError:null,createdAt:new Date().toISOString()};
  const context={accountMode:"sandbox",contextFingerprint:quote.contextFingerprint,maxParcels:1};
  const remote={id:123,externalId:request.externalId,status:"new",trackingNumber:null,trackingUrl:"https://tracking.example.com/123",amountCents:quote.amountCents};
  return {order,request,record,context,remote};
}
