import { getProducts } from "@/lib/api";
import { buildStorefrontCatalog } from "@/modules/inventory/domain/catalog-visibility";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";

/** Home previews and the store use the same stock visibility rules. Server only. */
export async function loadStorefrontProducts() {
  const products = await getProducts();
  if (!products.length) return [];
  const stocks = await inventoryStore().list(products.map(p => ({ id: p._id, name: p.name, price: p.price })));
  return buildStorefrontCatalog(products, stocks);
}
