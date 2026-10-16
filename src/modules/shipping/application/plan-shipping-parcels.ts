import { buildSharedBoxPlan, type ShippingBox } from "../domain/shared-box-plan";
import {
  buildParcelPlan,
  normalizeShippingLines,
  type ParcelConstraints,
  type ParcelGroupingRule,
  type ParcelPlan,
  type ShippingLine,
  type ShippingProfile,
} from "../domain/parcel-plan";

export type ShippingProfileCatalog = {
  findByIds(productIds: string[]): Promise<Array<{
    id: string;
    sellable: boolean;
    profile: ShippingProfile | null;
  }>>;
};

type PlanShippingParcelsDependencies = {
  catalog: ShippingProfileCatalog;
  groupingRules: ParcelGroupingRule[];
  boxes?: { list(): Promise<ShippingBox[]> };
  constraints: ParcelConstraints;
};

export class UnshippableProductError extends Error {
  constructor(readonly productIds: string[]) {
    super(`Products cannot be shipped: ${productIds.join(", ")}`);
    this.name = "UnshippableProductError";
  }
}

export async function planShippingParcels(
  dependencies: PlanShippingParcelsDependencies,
  items: ShippingLine[],
): Promise<ParcelPlan> {
  const normalizedItems = normalizeShippingLines(items, dependencies.constraints.maxUnits);
  const productIds = normalizedItems.map((item) => item.productId);
  const products = await dependencies.catalog.findByIds(productIds);
  const productsById = new Map(products.map((product) => [product.id, product]));
  const unavailable = productIds
    .filter((id) => !productsById.get(id)?.sellable)
    .sort();
  if (unavailable.length > 0) {
    throw new UnshippableProductError(unavailable);
  }

  const profiles = products.flatMap((product) => product.profile ? [product.profile] : []);
  if (dependencies.boxes) return buildSharedBoxPlan({ items: normalizedItems, profiles, boxes: await dependencies.boxes.list(), constraints: dependencies.constraints });

  return buildParcelPlan({
    items: normalizedItems,
    profiles: products.flatMap((product) => product.profile ? [product.profile] : []),
    groupingRules: dependencies.groupingRules,
    constraints: dependencies.constraints,
  });
}
