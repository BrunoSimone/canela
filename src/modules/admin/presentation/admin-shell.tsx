import Link from "next/link";
import { databaseCatalog } from "@/modules/catalog/infrastructure/source";
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
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href={demo ? "/admin?demo=1" : "/admin"}>
            <CanelaBadge simple size={39} />
            <span>Canela</span>
            <span className={styles.brandDivider} />
            <span className={styles.brandSection}>Panel</span>
          </Link>
            {email && <nav aria-label="Administración" className={styles.adminNav}><Link href="/admin">Pedidos</Link><Link href="/admin/taller">Taller de cuadros</Link>{databaseCatalog()?<Link href="/admin/catalogo">Catálogo y stock</Link>:<a href="https://canela-artesanal.sanity.studio" target="_blank" rel="noopener noreferrer">Catálogo y stock</a>}</nav>}
          <div className={styles.headerActions}>
            {demo && <span className={styles.demoPill}>Vista de demostración</span>}
            <details className={styles.help}>
              <summary aria-label="Ayuda"><CircleHelp size={17} aria-hidden="true" /> Ayuda</summary>
              <div className={styles.helpPanel}>
                <strong>Cómo usar el panel</strong>
                <p>En Catálogo y stock editás productos, fotos, cantidades y cajas. En Taller de cuadros configurás los personalizados.</p>
                <p>En Pedidos buscás ventas y preparás sus envíos. Si aparece “Necesita revisión”, abrí la ficha y atendé el aviso con prioridad.</p>
              </div>
            </details>
            {email && <span className={styles.signedInAs}>{email}</span>}
            {!demo && email && (
              <form action="/api/admin/auth/logout" method="post">
                <button className={styles.logout} type="submit" aria-label="Cerrar sesión">
                  <LogOut size={17} /><span>Cerrar sesión</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </header>
      <div id="contenido" tabIndex={-1}>{children}</div>
    </div>
  );
}
