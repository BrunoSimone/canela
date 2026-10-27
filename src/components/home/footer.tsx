import Link from "next/link";

import { STORE_LINKS } from "@/content/catalog";
import { CanelaBadge } from "@/components/brand/canela-badge";
import { siteConfig } from "@/lib/config";
import { BuyingGuideLink } from "./buying-guide-link";

export function Footer({ customizationEnabled = false }: { customizationEnabled?: boolean }) {
  const links = [...STORE_LINKS, ...(customizationEnabled ? [
    { label: "Crear mi cuadro", href: "/crear-cuadro" },
    { label: "Galería de cuadros", href: "/cuadros" },
    { label: "Cómo comprar tu cuadro", href: "/crear-cuadro#como-comprar" },
  ] : [])];
  return (
    <footer className="bg-[var(--canela-footer)] text-[#EADFCA]">
      <div className="mx-auto grid max-w-[1180px] gap-9 px-[22px] pb-8 pt-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <CanelaBadge simple size={52} />
            <span className="font-heading text-[30px] text-[#F6EFE1]">
              {siteConfig.name}
            </span>
          </div>
          <p className="max-w-[280px] text-sm leading-relaxed text-[#cbb894]">
            {siteConfig.tagline}. Vidrio, cerámica y espejos hechos a mano.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--canela-ochre)]">
            Seguinos
          </span>
          <a
            href={siteConfig.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-[15px] text-[#EADFCA] hover:text-white"
          >
            Instagram · {siteConfig.instagram}
          </a>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--canela-ochre)]">
            Explorar
          </span>
          {links.map((link) => {
            const Component = link.href.endsWith("#como-comprar") ? BuyingGuideLink : Link;
            return <Component
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-[15px] text-[#EADFCA] hover:text-white"
            >
              {link.label}
            </Component>;
          })}
        </div>
      </div>
      <div className="border-t border-[rgba(234,223,202,.15)] px-[22px] py-5 text-center text-[13px] text-[#bca57f]">
        © 2026 {siteConfig.name} · Diseño artesanal
      </div>
    </footer>
  );
}
