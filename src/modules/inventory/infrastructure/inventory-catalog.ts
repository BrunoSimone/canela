import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import type { InventoryProduct } from "../domain/stock-edit";
const client = createClient({ projectId, dataset, apiVersion, useCdn: false });
export function readInventoryCatalog(): Promise<InventoryProduct[]> {
  return client.fetch(`*[_type == "producto"] | order(name asc) { "id": _id, name, price }`, {}, { cache: "no-store", perspective: "published" });
}
