"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { NAV_LINKS } from "@/content/catalog";
import { CanelaBadge } from "@/components/brand/canela-badge";

export function Navbar({ customizationEnabled = false }: { customizationEnabled?: boolean }) {
  const links = customizationEnabled ? [
    { label: "Tienda", href: "/#catalogo" },
    { label: "Galería de cuadros", href: "/cuadros" },
    ...NAV_LINKS.slice(3),
    { label: "Crear mi cuadro", href: "/crear-cuadro" },
  ] : NAV_LINKS;
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header onKeyDown={(event) => { if (event.key === "Escape" && mobileOpen) { setMobileOpen(false); menuButton.current?.focus(); } }} className="sticky top-0 z-[60] border-b border-[rgba(184,132,42,.22)] bg-[rgba(246,239,225,.9)] backdrop-blur-md">
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-[22px] py-2.5">
        <Link href="/" className="flex items-center gap-3 text-[var(--canela-brown)]">
          <CanelaBadge simple size={44} />
          <span className="font-heading text-[27px] leading-none text-[var(--canela-brown)]">
            Canela
          </span>
        </Link>

        <nav aria-label="Navegación principal" className={`hidden items-center gap-7 ${customizationEnabled ? "lg:flex" : "md:flex"}`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`inline-flex min-h-11 items-center text-[14px] font-semibold transition-colors ${link.href === "/crear-cuadro" ? "rounded-full bg-[var(--canela-brown)] px-5 text-[var(--canela-cream-card)] hover:bg-[#6e4e38]" : "text-[var(--canela-brown)] hover:text-[var(--canela-ochre-dark)]"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          ref={menuButton}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menú"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          className={`flex size-11 items-center justify-center rounded-xl border border-[rgba(184,132,42,.4)] text-[var(--canela-brown)] ${customizationEnabled ? "lg:hidden" : "md:hidden"}`}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Navegación móvil" className={`flex flex-col border-t border-[rgba(184,132,42,.15)] px-[22px] pb-4 pt-1.5 ${customizationEnabled ? "lg:hidden" : "md:hidden"}`}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`min-h-11 border-b border-[rgba(184,132,42,.12)] py-2.5 text-base font-semibold last:border-0 ${link.href === "/crear-cuadro" ? "mt-3 rounded-full bg-[var(--canela-brown)] px-5 text-center text-[var(--canela-cream-card)]" : "text-[var(--canela-brown)]"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
