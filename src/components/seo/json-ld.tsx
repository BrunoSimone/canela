import { siteConfig } from "@/lib/config";

function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function StoreJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${siteConfig.url}/#store`,
    name: siteConfig.legalName,
    description: siteConfig.description,
    url: siteConfig.url,
    image: `${siteConfig.url}/canela-logo.png`,
    logo: `${siteConfig.url}/canela-logo.png`,
    priceRange: "$$",
    ...(siteConfig.whatsappNumber
      ? { telephone: `+${siteConfig.whatsappNumber}` }
      : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.city,
      addressRegion: siteConfig.region,
      addressCountry: siteConfig.country,
    },
    areaServed: siteConfig.city,
    sameAs: [siteConfig.instagramUrl],
  };
  return <JsonLdScript data={data} />;
}
