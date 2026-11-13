import { expect, it } from "vitest";
import { parseCatalogDocument, parseCatalogImage } from "./editor";
const image = { assetId: "a".repeat(64) };
const product = {
  name: "Florero",
  category: "vidrio",
  sub: "Reciclado",
  price: 100,
  images: [image],
  shippingProfile: {
    weightGrams: 200,
    heightCm: 20,
    widthCm: 10,
    lengthCm: 10,
    classificationId: "6",
  },
};
it("allows incomplete drafts, but publishing requires commercial and shipping data", () => {
  expect(parseCatalogDocument("product", { name: "En preparación" })).toEqual({
    name: "En preparación",
  });
  expect(() =>
    parseCatalogDocument("product", { name: "En preparación" }, true),
  ).toThrow();
  expect(parseCatalogDocument("product", product, true).price).toBe(100);
  expect(() =>
    parseCatalogDocument(
      "product",
      { ...product, shippingProfile: null },
      true,
    ),
  ).toThrow();
  expect(() =>
    parseCatalogDocument("product", { ...product, sub: "Jardín" }, true),
  ).toThrow();
});
it("strips injected stock, URLs, original keys and internal fields", () => {
  const result = parseCatalogDocument(
    "product",
    {
      ...product,
      stockOnHand: 999,
      originalKey: "secret",
      images: [{ ...image, url: "http://localhost/secret" }],
    },
    true,
  );
  expect(result).not.toHaveProperty("stockOnHand");
  expect(result.images).toEqual([image]);
});
it("rejects malformed images, unsafe crops and oversized documents", () => {
  for (const v of [
    { assetId: "http://attacker" },
    { ...image, crop: { top: 0.6, bottom: 0.6, left: 0, right: 0 } },
    { ...image, hotspot: { x: NaN, y: 0, width: 1, height: 1 } },
  ])
    expect(() => parseCatalogImage(v)).toThrow();
  expect(() =>
    parseCatalogDocument("product", { description: "a".repeat(250000) }),
  ).toThrow();
  expect(() =>
    parseCatalogDocument("product", { images: Array(21).fill(image) }),
  ).toThrow();
});
