import type { Stock } from "./stock-edit";

type PublicProduct = { _id: string };
type InventoryAvailability = Pick<Stock, "stockOnHand" | "reserved" | "enabled"> & { id: string };

/** Only a boolean crosses the storefront boundary; private balances stay here. */
export function buildStorefrontCatalog<T extends PublicProduct>(
  products: T[], stocks: readonly InventoryAvailability[],
): (T & { available: boolean })[] {
  const byId = new Map(stocks.map(stock => [stock.id, stock]));
  return products.flatMap(product => {
    const stock = byId.get(product._id);
    if (!stock?.enabled) return [];
    return [{ ...product, available: stock.stockOnHand > stock.reserved }];
  });
}
