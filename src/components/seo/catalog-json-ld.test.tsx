import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogJsonLd } from "./catalog-json-ld";

describe("STK-04 stock availability for search engines", () => {
  it("uses the same computed availability as the product card", () => {
    const base = { _id: "piece", name: "Cuenco", category: "ceramica" as const, sub: "Casa", price: 12000,
      images: [{ _type: "image", asset: { _type: "reference", _ref: "image-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-100x100-png" } }] };
    const html = renderToStaticMarkup(<CatalogJsonLd products={[{ ...base, available: true }, { ...base, _id: "empty", available: false }]} />);
    const data = JSON.parse(html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>")));
    expect(data.itemListElement.map((entry: { item: { offers: { availability: string } } }) => entry.item.offers.availability))
      .toEqual(["https://schema.org/InStock", "https://schema.org/OutOfStock"]);
  });
});
