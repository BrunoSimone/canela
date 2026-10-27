import { hasAsset, urlFor } from "@/sanity/client";
import { getHeroSlides } from "@/lib/api";
import { customizationEnabled } from "@/modules/customization/infrastructure/availability";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";
import { loadGallery } from "@/modules/customization/application/catalog";
import { HomeDestinations } from "@/components/home/home-destinations";
import { LegacyCatalogLinks } from "@/components/home/legacy-catalog-links";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [slides, designs] = await Promise.all([
    getHeroSlides(),
    customizationEnabled() ? loadGallery(demoDesignCatalog) : Promise.resolve(null),
  ]);
  const photo = slides.find(slide => hasAsset(slide.image));
  const image = photo && hasAsset(photo.image) ? { src: urlFor(photo.image).width(1200).height(900).fit("crop").url(), alt: photo.name } : null;
  return <>
    <LegacyCatalogLinks />
    <HomeDestinations image={image} templates={designs?.templates ?? null} />
  </>;
}
