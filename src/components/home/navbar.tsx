"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { NAV_LINKS } from "@/content/catalog";
import { CanelaBadge } from "@/components/brand/canela-badge";

export function Navbar() {
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

        <nav aria-label="Navegación principal" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[var(--canela-brown)] transition-colors hover:text-[var(--canela-ochre-dark)]"
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
          className="flex size-11 items-center justify-center rounded-xl border border-[rgba(184,132,42,.4)] text-[var(--canela-brown)] md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" aria-label="Navegación móvil" className="flex flex-col border-t border-[rgba(184,132,42,.15)] px-[22px] pb-4 pt-1.5 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="border-b border-[rgba(184,132,42,.12)] py-2.5 text-base font-semibold text-[var(--canela-brown)] last:border-0"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
