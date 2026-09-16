import { hasAsset, urlFor } from "@/sanity/client";
import { Hero, type HeroSlideView } from "@/components/home/hero";
import { CatalogJsonLd } from "@/components/seo/catalog-json-ld";
import { CategorySection } from "@/components/catalog/category-section";
import { Nosotros } from "@/components/home/nosotros";
import { ComoComprar } from "@/components/home/como-comprar";
import { CATEGORIES } from "@/content/catalog";
import { getHeroSlides, getProducts, groupByCategory } from "@/lib/api";
import { filterCatalogByAvailability } from "@/modules/inventory/domain/catalog-visibility";
import { PostgresProductAvailabilityRepository } from "@/modules/inventory/infrastructure/postgres/product-availability-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const availability = new PostgresProductAvailabilityRepository();
  const [products, heroSlides, availableProductIds] = await Promise.all([
    getProducts(),
    getHeroSlides(),
    availability.listAvailableProductIds(),
  ]);
  const visibleProducts = filterCatalogByAvailability(
    products,
    availableProductIds,
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
      <CatalogJsonLd products={visibleProducts} />
      <Hero slides={heroViews} />

      <div id="catalogo" className="anchor-offset px-[22px] pb-2 pt-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#8A9256]">
          Nuestro catálogo
        </span>
      </div>

      {CATEGORIES.map((meta) => (
        <CategorySection
          key={meta.key}
          meta={meta}
          products={byCategory[meta.key]}
        />
      ))}

      <Nosotros />
      <ComoComprar />
    </>
  );
}
