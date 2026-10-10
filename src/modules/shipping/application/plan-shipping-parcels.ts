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

  return buildParcelPlan({
    items: normalizedItems,
    profiles: products.flatMap((product) => product.profile ? [product.profile] : []),
    groupingRules: dependencies.groupingRules,
    constraints: dependencies.constraints,
  });
}
