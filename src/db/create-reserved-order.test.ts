import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LOCK_MINUTES,
  InvalidOrderInputError,
  validateReservedOrderInput,
  type CreateReservedOrderInput,
} from "./create-reserved-order";

const validInput: CreateReservedOrderInput = {
  orderId: "d71466b7-f0e7-4434-bd72-047287217728",
  publicTokenHash: "a".repeat(64),
  idempotencyKey: "97683b2b-6e37-493b-ae7a-271f249ee7db",
  currency: "ARS",
  shippingCents: 500,
  now: new Date("2026-09-09T12:00:00.000Z"),
  items: [
    {
      productId: "product-b",
      name: "Producto B",
      unitPriceCents: 1_500,
      quantity: 2,
    },
    {
      productId: "product-a",
      name: "Producto A",
      unitPriceCents: 2_000,
      quantity: 1,
    },
  ],
};

describe("validateReservedOrderInput", () => {
  it("calculates integer totals, sorts locks and applies the 10 minute window", () => {
    const result = validateReservedOrderInput(validInput);

    expect(result.subtotalCents).toBe(5_000);
    expect(result.totalCents).toBe(5_500);
    expect(result.sortedItems.map((item) => item.productId)).toEqual([
      "product-a",
      "product-b",
    ]);
    expect(result.expiresAt.toISOString()).toBe("2026-09-09T12:10:00.000Z");
    expect(CHECKOUT_LOCK_MINUTES).toBe(10);
  });

  it("rejects duplicate products before opening a transaction", () => {
    expect(() =>
      validateReservedOrderInput({
        ...validInput,
        items: [validInput.items[0], validInput.items[0]],
      }),
    ).toThrow(InvalidOrderInputError);
  });

  it("rejects fractional quantities and prices", () => {
    expect(() =>
      validateReservedOrderInput({
        ...validInput,
        items: [{ ...validInput.items[0], quantity: 1.5 }],
      }),
    ).toThrow("Item quantity must be a positive integer");

    expect(() =>
      validateReservedOrderInput({
        ...validInput,
        items: [{ ...validInput.items[0], unitPriceCents: 1.5 }],
      }),
    ).toThrow("Item price must be a non-negative safe integer");
  });
});
