import { getDatabase } from "@/db/client";
import { PublicFrameReader } from "@/modules/customization/infrastructure/postgres/public-frame";
import { resumeFrame } from "@/modules/customization/application/resume-frame";
import { ComoComprar } from "@/components/home/como-comprar";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCreator } from "@/modules/customization/application/catalog";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { frameCommerceEnabled, frameCommerceMode } from "@/modules/customization/infrastructure/commerce-mode";
import { frameDesignCatalog, loadFrameWorkshop } from "@/modules/customization/infrastructure/frame-catalog";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import { WorkshopUnavailable } from '@/modules/customization/presentation/workshop-unavailable';
import { FrameCommerceError, workshopPending } from '@/modules/customization/domain/workshop';
import { FRAME_FORMATS, formatOf } from "@/modules/customization/domain/formats";
import { Creator } from "@/modules/customization/presentation/creator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear mi cuadro", referrer: "no-referrer", robots: { index: false, follow: false }, alternates: { canonical: "/crear-cuadro" } };
export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ diseno?: string | string[]; reintentar?: string | string[] }> }) {
  if (!customizationEnabled()) notFound();
  const query = await searchParams;
  const candidates=await Promise.all(FRAME_FORMATS.map(async id=>{
    try{return {id,...await loadCreator(frameDesignCatalog(id),typeof query.diseno==='string'?query.diseno:query.diseno?'invalid':undefined)};}
    catch(e){if(e instanceof FrameCommerceError&&e.code==='WORKSHOP_PENDING')return null;throw e;}
  }));
  const choices=candidates.filter(c=>c!==null);
  if(!choices.length)return <WorkshopUnavailable/>;
  let data=choices.find(c=>c.template)??choices[0];
  if (query.reintentar) {
    if (!frameCommerceEnabled() || typeof query.reintentar !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(query.reintentar)) notFound();
    const receipt=await new PublicFrameReader(getDatabase()).get(query.reintentar);
    const matching=receipt?choices.find(c=>c.id===formatOf(receipt.design.config)):null;
    if(!matching)notFound();
    const restored = resumeFrame(receipt, matching.config);
    if (!restored) notFound();
    data={...matching,template:restored,templateUnavailable:false};
  }
  const mode=frameCommerceMode();
  const formats=await Promise.all(choices.map(async choice=>{
    const workshop=frameCommerceEnabled()?await loadFrameWorkshop(choice.id):null;
    const ready=workshop&&(mode==='sandbox'||workshopPending(workshop).length===0);
    return {id:choice.id,config:choice.config,pricing:choice.pricing,purchaseSettings:ready&&mode?{mode,terms:workshop.terms,productionDays:workshop.productionDays}:undefined};
  }));
  const purchaseDemo = demoPurchaseEnabled();
  return <><Creator key={typeof query.diseno === "string" ? query.diseno : "new"} {...data} formats={formats} purchaseDemoEnabled={purchaseDemo}/><ComoComprar variant="frames" purchaseDemoEnabled={purchaseDemo || mode==="sandbox"} productionPurchaseEnabled={formats.some(f=>f.purchaseSettings?.mode==='production')} /></>;
}
