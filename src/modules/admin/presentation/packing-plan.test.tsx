import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PackingPlan } from "./packing-plan";
import type { PlannedParcel } from "../../shipping/domain/parcel-plan";
const base = { weightGrams: 2200, heightCm: 22, widthCm: 42, lengthCm: 42 };
const parcel: PlannedParcel = { ...base, items: [], groupingRule: null };
describe("MAR-04: physical estimates and quote margin", () => {
  it("distinguishes the actual estimated box from padded quote dimensions", () => {
    const html = renderToStaticMarkup(<PackingPlan items={[]} parcel={{ ...parcel, weightGrams: 2310, heightCm: 23, widthCm: 43, lengthCm: 43, quoteMargin: { status: "applied", base } }} />);
    expect(html).toContain("42 × 42 × 22 cm · 2200 g");
    expect(html).toContain("43 × 43 × 23 cm · 2310 g");
    expect(html).toContain("Cotización con margen de embalaje");
    expect(html).not.toContain("sin aumentar el precio");
    expect(html).toContain("peso y medidas reales");
  });
  it.each(["price_changed", "unavailable", "limits"] as const)("explains why %s did not include margin", status => {
    const html = renderToStaticMarkup(<PackingPlan items={[]} parcel={{ ...parcel, quoteMargin: { status, base } }} />);
    expect(html).toContain("Cotización sin margen adicional");
    expect(html).not.toContain("Cotización con margen de embalaje");
  });
  it("still displays historical parcels without margin metadata", () => {
    const html = renderToStaticMarkup(<PackingPlan items={[]} parcel={parcel} />);
    expect(html).toContain("42 × 42 × 22 cm · 2200 g");
    expect(html).not.toContain("Cotización con margen de embalaje");
  });
});
