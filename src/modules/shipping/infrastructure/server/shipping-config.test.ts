import { describe, expect, it } from "vitest";
import { readCheckoutConfig } from "../../../checkout/infrastructure/server/checkout-config";
import { readShippingConfig } from "./shipping-config";
import { fulfillmentEnabled } from "./fulfillment-service";
const env = { ZIPNOVA_API_TOKEN:"token",ZIPNOVA_API_SECRET:"secret",ZIPNOVA_ACCOUNT_ID:"12",ZIPNOVA_ORIGIN_ID:"34",ZIPNOVA_DISPATCH_TYPE:"carrier_dropoff",ZIPNOVA_ACCOUNT_MODE:"operational" };
describe("shipping configuration", () => {
  it("defaults to one parcel and includes the limit in the quote context", () => {
    expect(readShippingConfig(env).maxParcels).toBe(1);
    expect(readShippingConfig({...env, ZIPNOVA_MAX_PARCELS:"2"}).contextFingerprint).not.toBe(readShippingConfig(env).contextFingerprint);
    for (const limit of ["0", "21", "1.5", ""]) expect(() => readShippingConfig({...env, ZIPNOVA_MAX_PARCELS:limit})).toThrow();
  });
  it("enables fulfillment only with complete sandbox dropoff configuration and an explicit gate", () => {
    const sandbox={...env, ZIPNOVA_ACCOUNT_MODE:"sandbox", ZIPNOVA_FULFILLMENT_MODE:"sandbox"};
    expect(fulfillmentEnabled(sandbox)).toBe(true);
    for (const override of [{ZIPNOVA_ACCOUNT_MODE:"operational"}, {ZIPNOVA_FULFILLMENT_MODE:"disabled"}, {ZIPNOVA_FULFILLMENT_MODE:undefined}, {ZIPNOVA_DISPATCH_TYPE:"carrier_pickup"}, {ZIPNOVA_API_SECRET:undefined}]) {
      expect(fulfillmentEnabled({...sandbox,...override})).toBe(false);
    }
  });
  it("requires an explicit remote account mode and dispatch policy", () => {
    expect(readShippingConfig(env)).toMatchObject({ accountId:12,originId:34,accountMode:"operational",dispatchType:"carrier_dropoff" });
    expect(()=>readShippingConfig({...env,ZIPNOVA_ACCOUNT_MODE:undefined})).toThrow();
    expect(()=>readShippingConfig({...env,ZIPNOVA_DISPATCH_TYPE:undefined})).toThrow();
  });
  it("invalidates quote context after account, origin, dispatch or mode changes", () => {
    const original=readShippingConfig(env).contextFingerprint;
    for(const override of [{ZIPNOVA_ORIGIN_ID:"35"},{ZIPNOVA_ACCOUNT_ID:"13"},{ZIPNOVA_ACCOUNT_MODE:"sandbox"},{ZIPNOVA_DISPATCH_TYPE:"carrier_pickup"}]) {
      expect(readShippingConfig({...env,...override}).contextFingerprint).not.toBe(original);
    }
  });
  it("supports Zipnova with MP test credentials without requiring a fake shipping amount", () => {
    const config=readCheckoutConfig({CHECKOUT_MODE:"test",SHIPPING_PROVIDER:"zipnova",CHECKOUT_SIGNING_SECRET:"s".repeat(64),NEXT_PUBLIC_SITE_URL:"http://localhost:3000",MP_TEST_ACCESS_TOKEN:"test",DATABASE_URL:"postgres://test"});
    expect(config).toMatchObject({mode:"test",shippingProvider:"zipnova"});
    expect(()=>readCheckoutConfig({CHECKOUT_MODE:"production",SHIPPING_PROVIDER:"zipnova"})).toThrow();
  });
});
