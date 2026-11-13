// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PhotoFields } from "./photo-fields";
import { imageReferenceKey, publicationIssue } from "../domain/editor";
afterEach(cleanup);
it("keeps distinct previews for two crops of the same original", () => {
  const id = "a".repeat(64),
    first = { assetId: id },
    second = { assetId: id, crop: { top: 0.1, bottom: 0, left: 0, right: 0 } };
  render(
    <PhotoFields
      photos={[first, second]}
      previews={{
        [imageReferenceKey(first)]: {
          assetId: id,
          url: "https://images.test/full.webp",
          width: 200,
          height: 200,
        },
        [imageReferenceKey(second)]: {
          assetId: id,
          url: "https://images.test/crop.webp",
          width: 200,
          height: 180,
        },
      }}
      onChange={() => {}}
      onPreview={() => {}}
    />,
  );
  expect(screen.getByAltText("Foto 1").getAttribute("src")).toBe(
    "https://images.test/full.webp",
  );
  expect(screen.getByAltText("Foto 2").getAttribute("src")).toBe(
    "https://images.test/crop.webp",
  );
});
it("flags inherited incomplete products until protected shipping measurements are entered", () => {
  const document = {
    name: "Pieza",
    price: 100,
    category: "vidrio",
    sub: "Reciclado",
    images: [{ assetId: "a".repeat(64) }],
  };
  expect(publicationIssue("product", document)).toContain("peso");
  expect(
    publicationIssue("product", {
      ...document,
      shippingProfile: {
        weightGrams: 100,
        widthCm: 10,
        heightCm: 10,
        lengthCm: 10,
        classificationId: "6",
      },
    }),
  ).toBeNull();
});
