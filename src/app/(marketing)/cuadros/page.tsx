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
import { FRAME_FORMATS } from "@/modules/customization/domain/formats";
import { Gallery } from "@/modules/customization/presentation/gallery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catálogo de cuadros", robots: { index: false, follow: false }, alternates: { canonical: "/cuadros" } };
export default async function GalleryPage() {
  if (!customizationEnabled()) notFound();
  const groups=await Promise.all(FRAME_FORMATS.map(async format=>{
    try{return await loadGallery(frameDesignCatalog(format));}catch(e){if(e instanceof FrameCommerceError&&e.code==='WORKSHOP_PENDING')return null;throw e;}
  }));
  if(groups.every(g=>g===null))return <WorkshopUnavailable/>;
  const templates=[...new Map(groups.flatMap(g=>g?.templates??[]).map(t=>[t.id,t])).values()];
  return <><Gallery templates={templates} /><ComoComprar variant="frames" purchaseDemoEnabled={demoPurchaseEnabled()||frameCommerceMode()==="sandbox"} productionPurchaseEnabled={frameCommerceMode()==="production"} /></>;
}
