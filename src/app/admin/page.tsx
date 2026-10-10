import { redirect } from "next/navigation";

import { adminDemoEnabled } from "@/modules/admin/infrastructure/admin-config";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { AdminShell } from "@/modules/admin/presentation/admin-shell";
import { OrdersClient } from "@/modules/admin/presentation/orders-client";

export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const demo = adminDemoEnabled() && params.demo === "1";
  const session = demo ? null : await currentAdminSession();
  if (!demo && !session) redirect("/admin/ingresar");
  const q = typeof params.q === "string" ? params.q.slice(0, 128) : "";
  const sort = params.sort === "created_asc" ? "created_asc" : "created_desc";

  return (
    <AdminShell demo={demo} email={session?.email}>
      <OrdersClient demo={demo} initialQuery={q} initialSort={sort} />
    </AdminShell>
  );
}
