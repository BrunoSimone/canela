import { urlFor } from "@/sanity/client";
import { Hero, type HeroSlideView } from "@/components/home/hero";
import { CategorySection } from "@/components/catalog/category-section";
import { Nosotros } from "@/components/home/nosotros";
import { ComoComprar } from "@/components/home/como-comprar";
import { CATEGORIES } from "@/content/catalog";
import { getHeroSlides, getProducts, groupByCategory } from "@/lib/api";

export default async function HomePage() {
  const [products, heroSlides] = await Promise.all([
    getProducts(),
    getHeroSlides(),
  ]);
  const byCategory = groupByCategory(products);

  const heroViews: HeroSlideView[] = heroSlides.map((s) => ({
    name: s.name,
    caption: s.caption,
    href: `#${s.category}`,
    imageUrl: s.image ? urlFor(s.image).width(760).height(760).fit("crop").url() : null,
    label: s.imgLabel,
    tint: s.tint,
  }));

  return (
    <>
      <Hero slides={heroViews} />

      <div id="catalogo" className="anchor-offset px-[22px] pb-2 pt-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#8A9256]">
          Nuestro catálogo
        </span>
      </div>

      {CATEGORIES.map((meta) => (
        <CategorySection key={meta.key} meta={meta} products={byCategory[meta.key]} />
      ))}

      <Nosotros />
      <ComoComprar />
    </>
  );
}
