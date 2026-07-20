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
    name: siteConfig.legalName,
    description: siteConfig.description,
    url: siteConfig.url,
    ...(siteConfig.whatsappNumber
      ? { telephone: `+${siteConfig.whatsappNumber}` }
      : {}),
  };
  return <JsonLdScript data={data} />;
}
