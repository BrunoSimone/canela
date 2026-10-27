import { getDatabase } from "@/db/client";
import { PublicFrameReader } from "@/modules/customization/infrastructure/postgres/public-frame";
import { resumeFrame } from "@/modules/customization/application/resume-frame";
import { ComoComprar } from "@/components/home/como-comprar";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCreator } from "@/modules/customization/application/catalog";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { frameSandboxEnabled } from "@/modules/customization/infrastructure/commerce-mode";
import { frameDesignCatalog, loadFrameWorkshop } from "@/modules/customization/infrastructure/sanity-workshop";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import { Creator } from "@/modules/customization/presentation/creator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear mi cuadro", referrer: "no-referrer", robots: { index: false, follow: false }, alternates: { canonical: "/crear-cuadro" } };
export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ diseno?: string | string[]; reintentar?: string | string[] }> }) {
  if (!customizationEnabled()) notFound();
  const query = await searchParams;
  const data = await loadCreator(frameDesignCatalog(), typeof query.diseno === "string" ? query.diseno : query.diseno ? "invalid" : undefined);
  if (query.reintentar) {
    if (!frameSandboxEnabled() || typeof query.reintentar !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(query.reintentar)) notFound();
    const restored = resumeFrame(await new PublicFrameReader(getDatabase()).get(query.reintentar), data.config);
    if (!restored) notFound();
    data.template = restored;
    data.templateUnavailable = false;
  }
  const workshop = frameSandboxEnabled() ? await loadFrameWorkshop() : null;
  const purchaseDemo = demoPurchaseEnabled();
  return <><Creator key={typeof query.diseno === "string" ? query.diseno : "new"} {...data} purchaseDemoEnabled={purchaseDemo} sandboxPurchase={workshop ? {terms:workshop.terms,productionDays:workshop.productionDays} : undefined} /><ComoComprar variant="frames" purchaseDemoEnabled={purchaseDemo || !!workshop} /></>;
}
