"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { NAV_LINKS } from "@/content/catalog";
import { CanelaBadge } from "@/components/brand/canela-badge";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[60] border-b border-[rgba(184,132,42,.22)] bg-[rgba(246,239,225,.9)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-[22px] py-2.5">
        <a href="#top" className="flex items-center gap-3 text-[var(--canela-brown)]">
          <CanelaBadge simple size={44} />
          <span className="font-heading text-[27px] leading-none text-[var(--canela-brown)]">
            Canela
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] font-semibold text-[var(--canela-brown)] transition-colors hover:text-[var(--canela-ochre-dark)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menú"
          className="flex size-11 items-center justify-center rounded-xl border border-[rgba(184,132,42,.4)] text-[var(--canela-brown)] md:hidden"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="flex flex-col border-t border-[rgba(184,132,42,.15)] px-[22px] pb-4 pt-1.5 md:hidden">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="border-b border-[rgba(184,132,42,.12)] py-2.5 text-base font-semibold text-[var(--canela-brown)] last:border-0"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
