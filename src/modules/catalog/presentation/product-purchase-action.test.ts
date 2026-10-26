import { describe, expect, it } from "vitest";
import { describeProductPurchaseAction } from "./product-purchase-action";

describe("STK-03 stock-aware purchase controls", () => {
  it.each([0, 2])("disables buying an unavailable item already selected %i times", quantity => {
    expect(describeProductPurchaseAction({ quantity, available: false }))
      .toMatchObject({ disabled: true, idleLabel: "Agotado", selectedLabel: "Agotado" });
  });
  it("lets available products enter the cart without an editorial mode", () => {
    expect(describeProductPurchaseAction({ quantity: 0, available: true }))
      .toMatchObject({ disabled: false, idleLabel: "Agregar al carrito" });
    expect(describeProductPurchaseAction({ quantity: 3, available: true }))
      .toMatchObject({ disabled: false, selectedLabel: "En tu carrito · 3" });
  });
});
