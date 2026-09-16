import { describe, expect, it } from "vitest";

import { filterCatalogByAvailability } from "./catalog-visibility";

describe("filterCatalogByAvailability", () => {
  const products = [
    { _id: "available", tone: "unica" as const },
    { _id: "sold-out", tone: "stock" as const },
    { _id: "commission", tone: "encargo" as const },
  ];

  it("shows direct-sale products only while inventory is available", () => {
    expect(
      filterCatalogByAvailability(products, new Set(["available"])),
    ).toEqual([products[0], products[2]]);
  });

  it("keeps commissioned products outside the numeric inventory flow", () => {
    expect(filterCatalogByAvailability(products, new Set())).toEqual([
      products[2],
    ]);
  });
});
