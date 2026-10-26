import { describe, expect, it } from "vitest";
import { buildStorefrontCatalog } from "./catalog-visibility";

describe("STK-01/03 availability from authoritative stock", () => {
  const products = [
    { _id: "last", name: "Última", tone: "encargo", statusNote: "En stock" },
    { _id: "empty", name: "Agotada", tone: "stock", statusNote: "Disponible" },
    { _id: "reserved", name: "Reservada", tone: "unica" },
    { _id: "paused", name: "Pausada" },
    { _id: "missing", name: "Sin cargar" },
  ];
  const stocks = [
    { id: "last", stockOnHand: 2, reserved: 1, enabled: true },
    { id: "empty", stockOnHand: 0, reserved: 0, enabled: true },
    { id: "reserved", stockOnHand: 1, reserved: 1, enabled: true },
    { id: "paused", stockOnHand: 8, reserved: 0, enabled: false },
  ];
  it("uses the remaining balance, ignoring all legacy editorial labels", () => {
    expect(buildStorefrontCatalog(products, stocks).map(p => [p._id, p.available]))
      .toEqual([["last", true], ["empty", false], ["reserved", false]]);
  });
  it("keeps private inventory fields out of the public product", () => {
    const result = buildStorefrontCatalog(products, stocks);
    for (const product of result) {
      expect(product).not.toHaveProperty("stockOnHand");
      expect(product).not.toHaveProperty("reserved");
      expect(product).not.toHaveProperty("enabled");
    }
  });
  it("becomes available on replenishment and preserves catalog order", () => {
    expect(buildStorefrontCatalog(products, stocks.map(s => ({ ...s, stockOnHand: 3 })))
      .map(p => [p._id, p.available])).toEqual([["last", true], ["empty", true], ["reserved", true]]);
    expect(buildStorefrontCatalog(products, [])).toEqual([]);
  });
});
