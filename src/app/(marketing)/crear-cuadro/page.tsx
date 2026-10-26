import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCreator } from "@/modules/customization/application/catalog";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";
import { Creator } from "@/modules/customization/presentation/creator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Crear mi cuadro", robots: { index: false, follow: false }, alternates: { canonical: "/crear-cuadro" } };
export default async function CreatorPage({ searchParams }: { searchParams: Promise<{ diseno?: string | string[] }> }) {
  if (!customizationEnabled()) notFound();
  const query = await searchParams;
  const data = await loadCreator(demoDesignCatalog, typeof query.diseno === "string" ? query.diseno : query.diseno ? "invalid" : undefined);
  return <Creator key={typeof query.diseno === "string" ? query.diseno : "new"} {...data} />;
}
