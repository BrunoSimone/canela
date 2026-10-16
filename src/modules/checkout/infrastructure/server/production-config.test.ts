import { describe, expect, it } from "vitest";
import { readCheckoutConfig } from "./checkout-config";
import { readMercadoPagoPaymentConfig } from "@/modules/payments/infrastructure/server/payment-config";
import { readMercadoPagoWebhookConfig } from "@/modules/payments/infrastructure/server/webhook-config";
import { fulfillmentEnabled } from "@/modules/shipping/infrastructure/server/fulfillment-service";
export const productionEnv={CHECKOUT_MODE:"production",PAYMENT_ENVIRONMENT:"production",COMMERCE_PRODUCTION_APPROVED:"1",DATABASE_URL:"postgres://test",CHECKOUT_SIGNING_SECRET:"s".repeat(64),NEXT_PUBLIC_SITE_URL:"https://canela.test",SHIPPING_PROVIDER:"zipnova",ZIPNOVA_API_TOKEN:"zip-token",ZIPNOVA_API_SECRET:"zip-secret",ZIPNOVA_ACCOUNT_ID:"12",ZIPNOVA_ORIGIN_ID:"34",ZIPNOVA_ACCOUNT_MODE:"operational",ZIPNOVA_DISPATCH_TYPE:"carrier_dropoff",ZIPNOVA_FULFILLMENT_MODE:"production",MP_PRODUCTION_ACCESS_TOKEN:"live-key",MP_PRODUCTION_WEBHOOK_SECRET:"live-secret",MP_PRODUCTION_SELLER_USER_ID:"12",MP_PRODUCTION_APPLICATION_ID:"34",ORDER_EMAIL_MODE:"production",ORDER_OWNER_EMAIL:"owner@example.com",ORDER_EMAIL_FROM:"Canela <pedidos@canela.test>",RESEND_API_KEY:"mail-key"};
describe("OPS-08 production configuration",()=>{
 it("uses explicit live credentials only when all gates are ready",()=>{
  expect(readCheckoutConfig(productionEnv)).toMatchObject({mode:"production",mercadoPagoAccessToken:"live-key"});
  expect(readMercadoPagoWebhookConfig(productionEnv)).toMatchObject({liveMode:true,secret:"live-secret",environment:"production"});
  expect(fulfillmentEnabled(productionEnv)).toBe(true);
 });
 it.each(["COMMERCE_PRODUCTION_APPROVED","MP_PRODUCTION_ACCESS_TOKEN","MP_PRODUCTION_WEBHOOK_SECRET","MP_PRODUCTION_SELLER_USER_ID","MP_PRODUCTION_APPLICATION_ID","ORDER_OWNER_EMAIL","ZIPNOVA_API_TOKEN","RESEND_API_KEY"])("fails closed without %s, even when test credentials exist",key=>{
  expect(()=>readCheckoutConfig({...productionEnv,[key]:undefined,MP_TEST_ACCESS_TOKEN:"test-key"})).toThrow();
 });
 it.each([{NEXT_PUBLIC_SITE_URL:"http://canela.test"},{SHIPPING_PROVIDER:"controlled_test"},{ZIPNOVA_ACCOUNT_MODE:"sandbox"},{ZIPNOVA_FULFILLMENT_MODE:"sandbox"},{ORDER_EMAIL_MODE:"test"},{PAYMENT_ENVIRONMENT:"test"}])("rejects incompatible production configuration %j",override=>{
  expect(()=>readCheckoutConfig({...productionEnv,...override})).toThrow();
 });
 it("keeps payment verification active when new checkout and commercial approval are disabled",()=>{
  const env={...productionEnv,CHECKOUT_MODE:"disabled",COMMERCE_PRODUCTION_APPROVED:"0",SITE_MAINTENANCE_MODE:"1"};
  expect(readCheckoutConfig(env)).toEqual({mode:"disabled"});
  expect(readMercadoPagoPaymentConfig(env)).toMatchObject({accessToken:"live-key",environment:"production"});
  expect(readMercadoPagoWebhookConfig(env).liveMode).toBe(true);
  expect(fulfillmentEnabled(env)).toBe(false);
 });
 it("never uses live keys as a fallback in test",()=>{
  expect(()=>readMercadoPagoPaymentConfig({...productionEnv,PAYMENT_ENVIRONMENT:"test"})).toThrow();
 });
});
