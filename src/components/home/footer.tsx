import Link from "next/link";

import { STORE_LINKS } from "@/content/catalog";
import { CanelaBadge } from "@/components/brand/canela-badge";
import { siteConfig } from "@/lib/config";
import { BuyingGuideLink } from "./buying-guide-link";
import styles from "./footer.module.css";

export function Footer({ customizationEnabled = false }: { customizationEnabled?: boolean }) {
  const links = [...STORE_LINKS, ...(customizationEnabled ? [
    { label: "Crear mi cuadro", href: "/crear-cuadro" },
    { label: "Galería de cuadros", href: "/cuadros" },
    { label: "Cómo comprar tu cuadro", href: "/crear-cuadro#como-comprar" },
  ] : [])];
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <CanelaBadge simple size={36} />
          <span>{siteConfig.name}</span>
        </div>
        <nav className={styles.links} aria-label="Enlaces del pie de página">
          {links.map((link) => {
            const Component = link.href.endsWith("#como-comprar") ? BuyingGuideLink : Link;
            return <Component
              key={link.href}
              href={link.href}
            >
              {link.label}
            </Component>;
          })}
        </nav>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 {siteConfig.name}</span>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">
          Instagram · {siteConfig.instagram}
        </a>
      </div>
    </footer>
  );
}
