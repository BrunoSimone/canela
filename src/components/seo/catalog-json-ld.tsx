import { hasAsset, urlFor } from "@/sanity/client";
import { siteConfig } from "@/lib/config";
import type { Product } from "@/lib/types";

const AVAILABILITY: Record<string, string> = {
  stock: "https://schema.org/InStock",
  unica: "https://schema.org/InStock",
  encargo: "https://schema.org/PreOrder",
};

export function CatalogJsonLd({ products }: { products: Product[] }) {
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
        brand: { "@type": "Brand", name: siteConfig.name },
        offers: {
          "@type": "Offer",
          priceCurrency: "ARS",
          price: p.price,
          availability: AVAILABILITY[p.tone] ?? "https://schema.org/InStock",
          url: `${siteConfig.url}/#${p.category}`,
          seller: { "@type": "Organization", name: siteConfig.legalName },
        },
      },
    }));

  if (items.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catálogo — ${siteConfig.name}`,
    itemListElement: items,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
