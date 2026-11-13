import { productCatalog,shippingProfileCatalog,shippingBoxes } from '@/modules/catalog/infrastructure/catalog-source';
import { getDatabase } from "@/db/client";
import type { QuoteShippingDependencies } from "../../application/quote-shipping";
import { SignedCourierQuoteService } from "../signed-courier-quote";
import { ZipnovaClient } from "../zipnova/client";
import { consumeShippingQuoteBudget, withQuoteBudget } from "./rate-limit";
import { readShippingConfig, ZIPNOVA_INPUT_CONSTRAINTS } from "./shipping-config";

export function createShippingDependencies(signingSecret: string): QuoteShippingDependencies {
  const config = readShippingConfig();
  if (config.accountMode !== ((process.env.PAYMENT_ENVIRONMENT ?? "test") === "production" ? "operational" : "sandbox")) throw new Error("Shipping environment mismatch");
  return {
    catalog: shippingProfileCatalog(), products: productCatalog(),
    boxes: shippingBoxes(), groupingRules: [], constraints: ZIPNOVA_INPUT_CONSTRAINTS,
    rates: withQuoteBudget(new ZipnovaClient(config), () => consumeShippingQuoteBudget(getDatabase())),
    issuer: new SignedCourierQuoteService(signingSecret),
    accountMode: config.accountMode, contextFingerprint: config.contextFingerprint,
    maxParcels: config.maxParcels, marginPolicy: config.marginPolicy,
  };
}
