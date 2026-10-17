import Link from "next/link";
import { CircleHelp, LogOut } from "lucide-react";

import { CanelaBadge } from "@/components/brand/canela-badge";

import styles from "./admin.module.css";

export function AdminShell({
  children,
  demo,
  email,
}: {
  children: React.ReactNode;
  demo: boolean;
  email?: string;
}) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href={demo ? "/admin?demo=1" : "/admin"}>
            <CanelaBadge simple size={39} />
            <span>Canela</span>
            <span className={styles.brandDivider} />
            <span className={styles.brandSection}>Pedidos</span>
          </Link>
          <div className={styles.headerActions}>
            {email && <nav aria-label="Administración" style={{ display: "flex", gap: 16 }}><Link href="/admin">Pedidos</Link><a href="https://canela-artesanal.sanity.studio" target="_blank" rel="noopener noreferrer">Catálogo y stock</a></nav>}
            {demo && <span className={styles.demoPill}>Vista de demostración</span>}
            <details className={styles.help}>
              <summary><CircleHelp size={17} /> Ayuda</summary>
              <div className={styles.helpPanel}>
                <strong>Cómo usar la bandeja</strong>
                <p>Buscá por ID, nombre, email o producto. Seleccioná un pedido para ver el resumen y abrí su ficha para registrar los bultos de una venta pagada.</p>
                <p>Los campos pendientes aparecen como “Aún no disponible”. Los pedidos de demostración no son ventas reales.</p>
              </div>
            </details>
            {email && <span className={styles.signedInAs}>{email}</span>}
            {!demo && email && (
              <form action="/api/admin/auth/logout" method="post">
                <button className={styles.logout} type="submit" title="Cerrar sesión">
                  <LogOut size={17} /><span>Cerrar sesión</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
