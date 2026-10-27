"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Help on the current journey must not unmount an unsaved frame design. */
export function BuyingGuideLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const sameGuide = href === "/tienda#como-comprar" ? pathname === "/tienda"
    : pathname === "/crear-cuadro" || pathname === "/cuadros";
  return sameGuide
    ? <a href="#como-comprar" className={className}>{children}</a>
    : <Link href={href} className={className}>{children}</Link>;
}
