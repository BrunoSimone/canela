import { SignedCourierQuoteService } from "../signed-courier-quote";
import { getDatabase } from "@/db/client";
import { FulfillOrder } from "../../application/fulfill-order";
import { FulfillmentError } from "../../domain/fulfillment";
import { PostgresShipmentRepository } from "../postgres-shipment-repository";
import { ZipnovaFulfillmentClient } from "../zipnova/fulfillment-client";
import { readShippingConfig } from "./shipping-config";
import { consumeShippingQuoteBudget } from "./rate-limit";

export function fulfillmentEnabled(env:Record<string,string|undefined>=process.env):boolean {
  try {
    const c=readShippingConfig(env);
    if (c.dispatchType!=="carrier_dropoff") return false;
    if (env.ZIPNOVA_FULFILLMENT_MODE==="sandbox") return c.accountMode==="sandbox" && (env.PAYMENT_ENVIRONMENT??"test")==="test";
    return env.ZIPNOVA_FULFILLMENT_MODE==="production" && env.COMMERCE_PRODUCTION_APPROVED==="1" && env.PAYMENT_ENVIRONMENT==="production" && c.accountMode==="operational" && c.maxParcels===1;
  } catch { return false; }
}
export function createFulfillmentService():FulfillOrder {
  if(!fulfillmentEnabled())throw new FulfillmentError("SHIPMENT_DISABLED",503);
  const sql=getDatabase(),config=readShippingConfig();
  return new FulfillOrder(new PostgresShipmentRepository(sql),new ZipnovaFulfillmentClient(config,fetch,()=>consumeShippingQuoteBudget(sql)),config,new SignedCourierQuoteService(process.env.CHECKOUT_SIGNING_SECRET??""));
}
