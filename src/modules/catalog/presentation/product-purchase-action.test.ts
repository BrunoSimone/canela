import { describe, expect, it } from "vitest";

import { describeProductPurchaseAction } from "./product-purchase-action";

describe("describeProductPurchaseAction", () => {
  it("presents direct-sale products as cart items in controlled checkout", () => {
    expect(
      describeProductPurchaseAction({
        quantity: 0,
        tone: "unica",
      }),
    ).toEqual({
      containerLabel: "En tu carrito",
      idleLabel: "Agregar al carrito",
      selectedLabel: "En tu carrito · 1",
    });
  });

  it("keeps commissioned products in the inquiry flow", () => {
    expect(
      describeProductPurchaseAction({
        quantity: 2,
        tone: "encargo",
      }),
    ).toEqual({
      containerLabel: "En tu consulta",
      idleLabel: "Agregar a mi consulta",
      selectedLabel: "En tu consulta · 2",
    });
  });

  it("presents stock products as cart items without coupling copy to a feature flag", () => {
    expect(
      describeProductPurchaseAction({
        quantity: 1,
        tone: "stock",
      }),
    ).toEqual({
      containerLabel: "En tu carrito",
      idleLabel: "Agregar al carrito",
      selectedLabel: "En tu carrito · 1",
    });
  });
});
