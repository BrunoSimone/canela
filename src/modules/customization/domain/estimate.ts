import { dimensions, validateWorkshop, type WorkshopConfig } from "./design";

/** Preview pricing only. A future purchase must be priced again by the server. */
export type PricingPolicy = {
  version: string; currency: "ARS"; provisional: true;
  tilePackCents: number; tilePackQuantity: number; roundToCents: number;
  sizes: { cells: number; laborCents: number; suppliesCents: number }[];
};
export type FrameEstimate = {
  currency: "ARS"; provisional: true; pricingVersion: string; size: number;
  tilesCents: number; laborCents: number; suppliesCents: number;
  roundingCents: number; totalCents: number; shippingCents: null;
};
// Bounds also keep all intermediate multiplication within safe integer precision.
const amount = (v: number) => Number.isSafeInteger(v) && v >= 0 && v <= 100_000_000_000;

export function validatePricing(config: WorkshopConfig, policy: PricingPolicy): void {
  validateWorkshop(config);
  if (!policy.version || policy.version.length > 80 || policy.currency !== "ARS" || policy.provisional !== true ||
    !amount(policy.tilePackCents) || policy.tilePackCents === 0 ||
    !Number.isSafeInteger(policy.tilePackQuantity) || policy.tilePackQuantity < 1 || policy.tilePackQuantity > 1_000_000 ||
    !amount(policy.roundToCents) || policy.roundToCents === 0 ||
    policy.sizes.length < 2 || policy.sizes.length > 100 ||
    policy.sizes[0].cells > config.minCells || policy.sizes.at(-1)!.cells < config.maxCells ||
    policy.sizes.some((entry, i, all) => !Number.isInteger(entry.cells) || entry.cells < 2 || entry.cells > 100 ||
      !amount(entry.laborCents) || !amount(entry.suppliesCents) ||
      (i > 0 && (entry.cells <= all[i - 1].cells || entry.laborCents < all[i - 1].laborCents || entry.suppliesCents < all[i - 1].suppliesCents)))) {
    throw new Error("La configuración de precios de prueba no es válida.");
  }
}

export function estimateFrame(config: WorkshopConfig, size: number, policy: PricingPolicy): FrameEstimate {
  dimensions(config, size);
  validatePricing(config, policy);
  const pieces = size ** 2;
  const upperIndex = Math.max(1, policy.sizes.findIndex(entry => entry.cells >= size));
  const lower = policy.sizes[upperIndex - 1], upper = policy.sizes[upperIndex];
  const interpolate = (field: "laborCents" | "suppliesCents") => lower[field] +
    Math.ceil((upper[field] - lower[field]) * (pieces - lower.cells ** 2) / (upper.cells ** 2 - lower.cells ** 2));
  const tilesCents = Math.ceil(policy.tilePackCents * pieces / policy.tilePackQuantity);
  const laborCents = interpolate("laborCents"), suppliesCents = interpolate("suppliesCents");
  const subtotal = tilesCents + laborCents + suppliesCents;
  const totalCents = Math.ceil(subtotal / policy.roundToCents) * policy.roundToCents;
  return { currency: "ARS", provisional: true, pricingVersion: policy.version, size,
    tilesCents, laborCents, suppliesCents, roundingCents: totalCents - subtotal, totalCents, shippingCents: null };
}

export const formatArs = (cents: number) => new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(cents / 100);
