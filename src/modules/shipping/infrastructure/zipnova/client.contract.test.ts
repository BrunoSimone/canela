import { describe, expect, it } from "vitest";
import { ZipnovaClient } from "./client";
import { readShippingConfig } from "../server/shipping-config";

// Quotes only: this file never creates shipments, labels, payments or account settings.
const enabled = process.env.RUN_ZIPNOVA_QUOTE_CONTRACT === "1";
(enabled ? describe : describe.skip)("Zipnova authenticated quote contract", () => {
  it("quotes one synthetic package in the explicitly configured account mode without booking it", async () => {
    const config = readShippingConfig({ ...process.env, ZIPNOVA_DISPATCH_TYPE: "carrier_dropoff" });
    const parcel = { weightGrams:1000,heightCm:10,widthCm:20,lengthCm:20,classificationId:"1",items:[{productId:"synthetic-contract-fixture",quantity:1}],groupingRule:null };
    const rates = await new ZipnovaClient(config).quoteShipment({ destination:{ city:"Palermo",provinceCode:"C",postalCode:"1425" },declaredValueCents:3000000,parcels:[parcel] });
    expect(rates.length).toBeGreaterThan(0);
    expect(rates.every(r => r.dispatchType === "carrier_dropoff" && Number.isSafeInteger(r.amountCents))).toBe(true);
  },20000);
});
