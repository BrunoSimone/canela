import { redirect } from "next/navigation";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { AdminShell } from "@/modules/admin/presentation/admin-shell";
import { InventoryClient } from "@/modules/inventory/presentation/inventory-client";
export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const session = await currentAdminSession();
  if (!session) redirect("/admin/ingresar");
  return <AdminShell demo={false} email={session.email}><InventoryClient /></AdminShell>;
}
