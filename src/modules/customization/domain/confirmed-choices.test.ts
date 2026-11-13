import { expect, it } from "vitest";
import { applyConfirmedChoices } from "./confirmed-choices";
import { storefrontPalette } from "../infrastructure/storefront-palette";
import materials from "../infrastructure/murvi-palette.json";
import { storefrontColorId } from "../infrastructure/storefront-palette";
import { workshopDocument } from "./workshop-document";
import { demoWorkshop } from "../infrastructure/demo-workshop";

it("updates confirmed choices idempotently without overwriting pricing, packages, historical colors or the source", async () => {
  const source = workshopDocument(await demoWorkshop());
  source.colors = materials.colors.map(c => ({...source.colors[0],publicId:storefrontColorId(c.id),name:c.code,hex:c.hex,enabled:true}));
  source.confirmations.pricing = true; source.confirmations.packaging = true;
  const enabled = new Set(storefrontPalette.map(color => color.id));
  const original = structuredClone(source);
  const updated = applyConfirmedChoices(source, enabled);
  expect(updated.geometry).toMatchObject({
    tileMm: 11,
    groutMm: source.geometry.groutMm,
    frameMm: 10,
    minCells: 15,
    maxCells: 90,
    step: 1,
  });
  expect(updated.pricing).toEqual(source.pricing);
  expect(updated.packages).toEqual(source.packages);
  expect(updated.colors).toHaveLength(62);
  expect(updated.colors.filter(c => c.enabled).map(c => c.publicId)).toEqual([...enabled]);
  expect(updated.colors.filter(c => !c.enabled)).toHaveLength(26);
  expect(updated.confirmations).toMatchObject({
    palette: true,
    pricing: false, packaging: false,
    geometry: false,
    production: false,
    terms: false,
  });
  expect(updated.capacity).toBeNull();
  expect(updated.productionDays).toBeNull();
  expect(applyConfirmedChoices(updated, enabled)).toEqual(updated);
  expect(source).toEqual(original);
});
