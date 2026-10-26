import type { PricingPolicy } from "../domain/estimate";

export const testPricing: PricingPolicy = {
  version: "test-1", currency: "ARS", provisional: true,
  tilePackCents: 1_391_750, tilePackQuantity: 225, roundToCents: 100_000,
  sizes: [
    { cells: 2, laborCents: 100_000, suppliesCents: 50_000 },
    { cells: 30, laborCents: 6_000_000, suppliesCents: 1_600_000 },
    { cells: 45, laborCents: 12_000_000, suppliesCents: 2_600_000 },
  ],
};
