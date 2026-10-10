import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { CanelaBadge } from "@/components/brand/canela-badge";
import { siteConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estamos preparando la tienda",
  description: "La tienda online de Canela está en preparación. Encontranos en Instagram mientras terminamos los últimos detalles.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  if (process.env.SITE_MAINTENANCE_MODE !== "1") redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center px-6 py-9 text-center sm:px-10 sm:py-12">
      <div className="flex items-center gap-3">
        <CanelaBadge simple size={48} priority />
        <span className="font-heading text-4xl">Canela</span>
      </div>

      <div className="my-auto w-full max-w-[660px] py-14 sm:py-20">
        <svg aria-hidden="true" viewBox="0 0 144 80" className="mx-auto mb-8 h-16 w-28" fill="none">
          <path d="M16 39 48 15l19 25-31 25Z" fill="#8A9256" />
          <path d="m58 12 35 2-15 26Z" fill="#B8842A" />
          <path d="m90 42 18-25 21 34-27 15Z" fill="#5E8C4E" />
          <path d="m46 66 27-21 19 26Z" fill="#B06A52" />
        </svg>
        <h1 className="font-heading text-[clamp(3rem,7vw,4.75rem)] leading-[1.08] text-[var(--canela-brown)]">
          Estamos poniendo a punto nuestra tienda
        </h1>
        <p className="mx-auto mt-7 max-w-[470px] text-base leading-relaxed text-[#6E4E38] sm:text-lg">
          El catálogo y las compras online están en pausa mientras terminamos
          los últimos detalles. Gracias por acompañar lo hecho a mano.
        </p>
        <a
          href={siteConfig.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-9 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[var(--canela-brown)] px-7 py-3 text-base font-bold text-[var(--canela-cream-card)] transition-colors hover:bg-[#6E4E38] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--canela-brown)]"
        >
          Seguinos en Instagram
          <ArrowUpRight size={19} aria-hidden="true" />
        </a>
      </div>

      <p className="max-w-64 text-sm leading-relaxed text-[#6E4E38]">
        Vidrio, cerámica y espejos.<br />
        Hechos con amor en Mar del Plata.
      </p>
    </main>
  );
}
