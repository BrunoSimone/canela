import { databaseCatalog } from "@/modules/catalog/infrastructure/source";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  redirect(databaseCatalog()?"/admin/catalogo":"https://canela-artesanal.sanity.studio");
}
