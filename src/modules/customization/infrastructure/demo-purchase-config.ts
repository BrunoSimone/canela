import type { DemoRecipient } from "../domain/purchase";

// Illustrative backend fixtures. Not a carrier tariff or confirmed packaging.
export const demoPurchasePolicy = {
  quoteTtlMs: 15 * 60_000, retentionMs: 30 * 60_000, maxQuotes: 100,
  capacity: 5, productionDays: 7, transitDays: 5,
  packages: [
    { maxCells: 15, weightGrams: 2_000, shippingCents: 850_000 },
    { maxCells: 30, weightGrams: 6_000, shippingCents: 1_200_000 },
    { maxCells: 45, weightGrams: 13_000, shippingCents: 1_800_000 },
  ],
  otherProvinceCents: 150_000, packagingExtraCm: 4, depthCm: 8,
};
export const demoRecipient: DemoRecipient = {
  email: "prueba@example.com",
  delivery: { type: "home", buyerName: "Persona de prueba", recipientName: "Persona de prueba", phone: "2235550100", recipientDocument: "12345678", streetName: "Calle de prueba", streetNumber: "123", floor: null, apartment: null, city: "Mar del Plata", provinceCode: "B", postalCode: "7600" },
};
