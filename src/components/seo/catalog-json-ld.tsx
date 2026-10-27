import { hasAsset, urlFor } from "@/sanity/client";
import { siteConfig } from "@/lib/config";
import type { StorefrontProduct } from "@/lib/types";

export function CatalogJsonLd({ products }: { products: StorefrontProduct[] }) {
  const items = products
    .filter((p) => p.images?.some(hasAsset))
    .map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        image: p.images
          .filter(hasAsset)
          .slice(0, 3)
          .map((img) => urlFor(img).width(1200).url()),
        ...(p.material ? { material: p.material } : {}),
        brand: {
          "@type": "Brand",
          name: siteConfig.name,
          alternateName: siteConfig.alternateName,
        },
        offers: {
          "@type": "Offer",
          priceCurrency: "ARS",
          price: p.price,
          availability: p.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${siteConfig.url}/tienda#${p.category}`,
          seller: { "@id": `${siteConfig.url}/#organization` },
        },
      },
    }));

  if (items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catálogo de ${siteConfig.name}`,
    itemListElement: items,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
