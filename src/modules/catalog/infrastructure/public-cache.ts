import { unstable_cache, revalidateTag } from "next/cache";
import { getDatabase } from "@/db/client";
import { databaseProducts, databaseSlides } from "./postgres/readers";
export const CATALOG_CACHE_TAG = "canela-public-catalog-v1";
// Editorial metadata only. Checkout and reservations always read current SQL data.
export const cachedProducts = unstable_cache(
  () => databaseProducts(getDatabase()),
  ["catalog-products-v1"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 300 },
);
export const cachedSlides = unstable_cache(
  () => databaseSlides(getDatabase()),
  ["catalog-slides-v1"],
  { tags: [CATALOG_CACHE_TAG], revalidate: 300 },
);
export function invalidatePublicCatalog() {
  revalidateTag(CATALOG_CACHE_TAG, { expire: 0 });
}
