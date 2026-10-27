"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CATALOG_ANCHORS = new Set(["#catalogo", "#vidrio", "#ceramica", "#espejos", "#como-comprar"]);

/** Fragments never reach the server. Keep links shared before /tienda working. */
export function LegacyCatalogLinks() {
  const router = useRouter();
  useEffect(() => {
    const redirect = () => {
      if (CATALOG_ANCHORS.has(window.location.hash)) {
        router.replace(`/tienda${window.location.search}${window.location.hash}`);
      }
    };
    redirect();
    window.addEventListener("hashchange", redirect);
    return () => window.removeEventListener("hashchange", redirect);
  }, [router]);
  return null;
}
