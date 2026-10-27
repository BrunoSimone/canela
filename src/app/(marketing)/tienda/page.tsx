import type { Metadata } from "next";
import { hasAsset, urlFor } from "@/sanity/client";
import { Hero, type HeroSlideView } from "@/components/home/hero";
import { CatalogJsonLd } from "@/components/seo/catalog-json-ld";
import { CategorySection } from "@/components/catalog/category-section";
import { ComoComprar } from "@/components/home/como-comprar";
import { CATEGORIES } from "@/content/catalog";
import { getHeroSlides, getProducts, groupByCategory } from "@/lib/api";
import { buildStorefrontCatalog } from "@/modules/inventory/domain/catalog-visibility";
import { CartAvailabilitySync } from "@/modules/cart/presentation/cart-availability-sync";
import { inventoryStore } from "@/modules/inventory/infrastructure/sanity-documents";
import { CatalogDiscovery } from "@/components/home/catalog-discovery";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Elegí piezas de vidrio, cerámica, espejos y cuadros de Canela. Revisá el envío y comprá con Mercado Pago.",
  alternates: { canonical: "/tienda" },
};

export default async function StorePage() {
  const availability = inventoryStore();
  const [products, heroSlides] = await Promise.all([
    getProducts(),
    getHeroSlides(),
  ]);
  const visibleProducts = buildStorefrontCatalog(
    products,
    await availability.list(products.map(p => ({ id: p._id, name: p.name, price: p.price }))),
  );
  const byCategory = groupByCategory(visibleProducts);

  const heroViews: HeroSlideView[] = heroSlides.map((s) => ({
    name: s.name,
    caption: s.caption,
    href: `#${s.category}`,
    imageUrl: hasAsset(s.image)
      ? urlFor(s.image).width(760).height(760).fit("crop").url()
      : null,
    label: s.imgLabel,
    tint: s.tint,
  }));

  return (
    <>
      <CartAvailabilitySync availableProductIds={visibleProducts.filter(p => p.available).map(p => p._id)} />
      <CatalogJsonLd products={visibleProducts} />
      <Hero slides={heroViews} />
      <CatalogDiscovery />

      {CATEGORIES.map((meta) => (
        <CategorySection
          key={meta.key}
          meta={meta}
          products={byCategory[meta.key]}
        />
      ))}

      <ComoComprar variant="store" />
    </>
  );
}
