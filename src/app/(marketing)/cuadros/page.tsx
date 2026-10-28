import { ComoComprar } from "@/components/home/como-comprar";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadGallery } from "@/modules/customization/application/catalog";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { frameDesignCatalog } from "@/modules/customization/infrastructure/frame-catalog";
import { WorkshopUnavailable } from '@/modules/customization/presentation/workshop-unavailable';
import { FrameCommerceError } from '@/modules/customization/domain/workshop';
import { frameCommerceMode } from '@/modules/customization/infrastructure/commerce-mode';
import { Gallery } from "@/modules/customization/presentation/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diseños de cuadros", robots: { index: false, follow: false }, alternates: { canonical: "/cuadros" } };
export default async function GalleryPage() {
  if (!customizationEnabled()) notFound();
  let data;try{data=await loadGallery(frameDesignCatalog());}catch(e){if(e instanceof FrameCommerceError&&e.code==='WORKSHOP_PENDING')return <WorkshopUnavailable/>;throw e;}
  const {templates}=data;
  return <><Gallery templates={templates} /><ComoComprar variant="frames" purchaseDemoEnabled={demoPurchaseEnabled()||frameCommerceMode()==="sandbox"} productionPurchaseEnabled={frameCommerceMode()==="production"} /></>;
}
