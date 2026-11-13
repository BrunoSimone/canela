import { currentAdminSession } from "@/modules/admin/infrastructure/admin-request";

/**
 * Server component rendered only during maintenance. The proxy already limits these
 * pages to valid panel sessions; the notice re-checks so it never shows for anyone else.
 */
export async function AdminPreviewNotice() {
  const session = await currentAdminSession().catch(() => null);
  if (!session) return null;
  return <div role="status" className="bg-[#4a3527] px-4 py-2 text-center text-sm font-semibold text-[#fbf7ee]">
    Vista previa del panel: la tienda sigue en mantenimiento para el público y los pagos están bloqueados.
  </div>;
}
