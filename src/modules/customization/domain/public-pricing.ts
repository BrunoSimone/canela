import { dimensions, type WorkshopConfig } from "./design";
import { estimateFrame, type FrameEstimate, type PricingPolicy } from "./estimate";

/** The browser receives final prices; material and labor costs stay on the server. */
export type PublicFrameEstimate = Pick<FrameEstimate, "currency" | "provisional" | "pricingVersion" | "size" | "totalCents" | "shippingCents">;
export type PublicPricing = { version: string; currency: "ARS"; provisional: boolean; prices: { cells: number; totalCents: number }[] };
export function publicEstimate(estimate: FrameEstimate): PublicFrameEstimate {
  const { currency, provisional, pricingVersion, size, totalCents, shippingCents } = estimate;
  return { currency, provisional, pricingVersion, size, totalCents, shippingCents };
}
export function publishPricing(config: WorkshopConfig, policy: PricingPolicy): PublicPricing {
  const prices = [];
  for (let cells = config.minCells; cells <= config.maxCells; cells += config.step) {
    prices.push({ cells, totalCents: estimateFrame(config, cells, policy).totalCents });
  }
  return { version: policy.version, currency: policy.currency, provisional: policy.provisional, prices };
}
export function lookupFrameEstimate(config: WorkshopConfig, size: number, pricing: PublicPricing): PublicFrameEstimate {
  dimensions(config, size);
  const price = pricing.prices.find(entry => entry.cells === size);
  if (!price || !Number.isSafeInteger(price.totalCents) || price.totalCents <= 0) throw Error("El precio del cuadro no está disponible.");
  return { currency: pricing.currency, provisional: pricing.provisional, pricingVersion: pricing.version, size, totalCents: price.totalCents, shippingCents: null };
}
