import { SanityShippingBoxes } from "../sanity/sanity-shipping-boxes";
import { getDatabase } from "@/db/client";
import { SanityProductCatalog } from "@/modules/catalog/infrastructure/sanity/sanity-product-catalog";
import type { QuoteShippingDependencies } from "../../application/quote-shipping";
import { SanityShippingProfileCatalog } from "../sanity/sanity-shipping-profile-catalog";
import { SignedCourierQuoteService } from "../signed-courier-quote";
import { ZipnovaClient } from "../zipnova/client";
import { consumeShippingQuoteBudget, withQuoteBudget } from "./rate-limit";
import { readShippingConfig, ZIPNOVA_INPUT_CONSTRAINTS } from "./shipping-config";

export function createShippingDependencies(signingSecret: string): QuoteShippingDependencies {
  const config = readShippingConfig();
  if (config.accountMode !== ((process.env.PAYMENT_ENVIRONMENT ?? "test") === "production" ? "operational" : "sandbox")) throw new Error("Shipping environment mismatch");
  return {
    catalog: new SanityShippingProfileCatalog(), products: new SanityProductCatalog(),
    boxes: new SanityShippingBoxes(), groupingRules: [], constraints: ZIPNOVA_INPUT_CONSTRAINTS,
    rates: withQuoteBudget(new ZipnovaClient(config), () => consumeShippingQuoteBudget(getDatabase())),
    issuer: new SignedCourierQuoteService(signingSecret),
    accountMode: config.accountMode, contextFingerprint: config.contextFingerprint,
    maxParcels: config.maxParcels, marginPolicy: config.marginPolicy,
  };
}
