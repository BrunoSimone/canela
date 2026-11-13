import { databaseCatalog } from '@/modules/catalog/infrastructure/source';
import { getDatabase } from '@/db/client';
import { CatalogRepository } from '@/modules/catalog/infrastructure/postgres/catalog-repository';
import { createClient } from "@sanity/client";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import type { InventoryProduct } from "../domain/stock-edit";
const client = createClient({ projectId, dataset, apiVersion, useCdn: false });
export async function readInventoryCatalog(): Promise<InventoryProduct[]> {
  if(databaseCatalog())return (await new CatalogRepository(getDatabase()).publicEntries('product')).map(r=>({id:r.id,name:r.published!.name!,price:r.published!.price!}));
  return client.fetch(`*[_type == "producto"] | order(name asc) { "id": _id, name, price }`, {}, { cache: "no-store", perspective: "published" });
}
