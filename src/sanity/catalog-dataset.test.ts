import { describe, expect, it } from "vitest";
import { resolveCatalogDataset } from "./catalog-dataset";

describe("catalog dataset isolation", () => {
  it("preserves the production default for the storefront and Studio", () => {
    expect(resolveCatalogDataset()).toBe("production");
    expect(resolveCatalogDataset(undefined, "production")).toBe("production");
  });
  it("allows an explicit isolated catalog locally and in preview", () => {
    expect(resolveCatalogDataset("inventory_test")).toBe("inventory_test");
    expect(resolveCatalogDataset("inventory_test", "preview")).toBe("inventory_test");
  });
  it("rejects a test catalog in Vercel Production", () => {
    expect(() => resolveCatalogDataset("inventory_test", "production")).toThrow("Production requires");
  });
  it.each(["", "../production", "production?query=", "Production", "a".repeat(65)])(
    "rejects the invalid dataset %j instead of falling back", value => {
      expect(() => resolveCatalogDataset(value)).toThrow("Invalid Sanity");
    },
  );
});
