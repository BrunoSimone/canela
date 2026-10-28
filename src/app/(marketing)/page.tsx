import { loadStorefrontProducts } from "@/lib/storefront-catalog";
import { selectCatalogPreview } from "@/components/home/catalog-preview";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { frameDesignCatalog } from "@/modules/customization/infrastructure/frame-catalog";
import { loadGallery } from "@/modules/customization/application/catalog";
import { HomeDestinations } from "@/components/home/home-destinations";
import { LegacyCatalogLinks } from "@/components/home/legacy-catalog-links";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, designs] = await Promise.all([
    // An unavailable preview must not prevent entry to either journey.
    loadStorefrontProducts().catch(() => []),
    customizationEnabled() ? Promise.resolve().then(() => loadGallery(frameDesignCatalog())).catch(() => null) : Promise.resolve(null),
  ]);
  return <>
    <LegacyCatalogLinks />
    <HomeDestinations products={selectCatalogPreview(products)} templates={designs?.templates ?? null} />
  </>;
}
