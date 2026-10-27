import { ComoComprar } from "@/components/home/como-comprar";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadGallery } from "@/modules/customization/application/catalog";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { frameDesignCatalog } from "@/modules/customization/infrastructure/sanity-workshop";
import { Gallery } from "@/modules/customization/presentation/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diseños de cuadros", robots: { index: false, follow: false }, alternates: { canonical: "/cuadros" } };
export default async function GalleryPage() {
  if (!customizationEnabled()) notFound();
  const { templates } = await loadGallery(frameDesignCatalog());
  return <><Gallery templates={templates} /><ComoComprar variant="frames" purchaseDemoEnabled={demoPurchaseEnabled()} /></>;
}
