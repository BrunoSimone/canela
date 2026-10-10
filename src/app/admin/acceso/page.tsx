import Link from "next/link";

import { AdminShell } from "@/modules/admin/presentation/admin-shell";
import styles from "@/modules/admin/presentation/admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage({ searchParams }: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AdminShell demo={false}>
    <main className={styles.loginMain}>
      <div className={styles.loginCard}>
        <h1>Confirmar acceso</h1>
        <p>Ingresá a la bandeja de pedidos de Canela desde este dispositivo.</p>
        {typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token) ? (
          <form action="/api/admin/auth/verify" method="post">
            <input type="hidden" name="token" value={token} />
            <button className={styles.primaryLink} type="submit">Entrar al panel</button>
          </form>
        ) : <Link href="/admin/ingresar" className={styles.primaryLink}>Solicitar un enlace nuevo</Link>}
      </div>
    </main>
  </AdminShell>;
}
