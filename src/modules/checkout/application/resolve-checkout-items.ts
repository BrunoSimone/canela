import type { ProductCatalog } from "../../catalog/domain/product-catalog";
import type { CheckoutItem } from "../domain/checkout";

export type RequestedCheckoutItem = {
  productId: string;
  quantity: number;
};

export class InvalidCheckoutItemsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCheckoutItemsError";
  }
}

export class ProductNotSellableError extends Error {
  constructor(readonly productIds: string[]) {
    super(`Products are not sellable: ${productIds.join(", ")}`);
    this.name = "ProductNotSellableError";
  }
}

export async function resolveCheckoutItems(
  catalog: ProductCatalog,
  requestedItems: RequestedCheckoutItem[],
): Promise<CheckoutItem[]> {
  validateRequestedItems(requestedItems);

  const products = await catalog.findByIds(
    requestedItems.map((item) => item.productId),
  );
  const productsById = new Map(products.map((product) => [product.id, product]));
  const unavailable = requestedItems
    .filter((item) => !productsById.get(item.productId)?.sellable)
    .map((item) => item.productId)
    .sort();

  if (unavailable.length > 0) {
    throw new ProductNotSellableError(unavailable);
  }

  return requestedItems.map((item) => {
    const product = productsById.get(item.productId)!;
    const unitPriceCents = product.priceArs * 100;

    if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
      throw new ProductNotSellableError([item.productId]);
    }

    return {
      productId: product.id,
      name: product.name,
      unitPriceCents,
      quantity: item.quantity,
    };
  });
}

function validateRequestedItems(items: RequestedCheckoutItem[]): void {
  if (items.length === 0) {
    throw new InvalidCheckoutItemsError("Checkout needs at least one item");
  }

  const productIds = new Set<string>();
  for (const item of items) {
    if (!item.productId.trim()) {
      throw new InvalidCheckoutItemsError("Product id is required");
    }
    if (productIds.has(item.productId)) {
      throw new InvalidCheckoutItemsError("Duplicate products are not allowed");
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new InvalidCheckoutItemsError(
        "Item quantity must be a positive integer",
      );
    }
    productIds.add(item.productId);
  }
}
