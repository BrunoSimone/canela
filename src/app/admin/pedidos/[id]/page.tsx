import { redirect } from "next/navigation";

import { adminDemoEnabled } from "@/modules/admin/infrastructure/admin-config";
import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";
import { AdminShell } from "@/modules/admin/presentation/admin-shell";
import { OrderDetailClient } from "@/modules/admin/presentation/order-detail-client";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [route, search] = await Promise.all([params, searchParams]);
  const demo = adminDemoEnabled() && search.demo === "1";
  const session = demo ? null : await currentAdminSession();
  if (!demo && !session) redirect("/admin/ingresar");
  const back = new URLSearchParams();
  if (demo) back.set("demo", "1");
  if (typeof search.q === "string") back.set("q", search.q.slice(0, 128));
  if (search.sort === "created_asc") back.set("sort", "created_asc");
  const backHref = `/admin${back.size ? `?${back}` : ""}`;

  return (
    <AdminShell demo={demo} email={session?.email}>
      <OrderDetailClient id={route.id} demo={demo} backHref={backHref} />
    </AdminShell>
  );
}
