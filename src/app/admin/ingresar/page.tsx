import Link from "next/link";

import { adminDemoEnabled } from "@/modules/admin/infrastructure/admin-config";
import { AdminShell } from "@/modules/admin/presentation/admin-shell";
import { LoginClient } from "@/modules/admin/presentation/login-client";
import styles from "@/modules/admin/presentation/admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <AdminShell demo={false}>
    <main className={styles.loginMain}>
      {params.error === "link" && <p className={styles.formError} role="alert">Ese enlace venció o ya fue utilizado. Solicitá uno nuevo.</p>}
      <LoginClient />
      {adminDemoEnabled() && <Link className={styles.demoLink} href="/admin?demo=1">Ver bandeja de demostración</Link>}
    </main>
  </AdminShell>;
}
