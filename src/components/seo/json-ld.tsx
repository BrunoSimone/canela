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
  const organizationId = `${siteConfig.url}/#organization`;
  const workshopId = `${siteConfig.url}/#workshop`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        alternateName: siteConfig.alternateName,
        publisher: { "@id": organizationId },
        inLanguage: "es-AR",
      },
      {
        "@type": "OnlineStore",
        "@id": organizationId,
        name: siteConfig.name,
        alternateName: [siteConfig.alternateName, siteConfig.legalName],
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
          streetAddress: siteConfig.workshop.streetAddress,
          postalCode: siteConfig.workshop.postalCode,
          addressLocality: siteConfig.city,
          addressRegion: siteConfig.region,
          addressCountry: siteConfig.country,
        },
        location: { "@id": workshopId },
        areaServed: {
          "@type": "City",
          name: siteConfig.city,
        },
        sameAs: [siteConfig.instagramUrl, siteConfig.artistInstagramUrl],
      },
      {
        "@type": "LocalBusiness",
        "@id": workshopId,
        name: siteConfig.workshop.name,
        description:
          "Taller de Mariela Deloso donde se producen las piezas artesanales de Canela Store.",
        telephone: siteConfig.workshop.telephone,
        url: siteConfig.url,
        hasMap: siteConfig.workshop.mapUrl,
        image: `${siteConfig.url}/canela-logo.png`,
        address: {
          "@type": "PostalAddress",
          streetAddress: siteConfig.workshop.streetAddress,
          postalCode: siteConfig.workshop.postalCode,
          addressLocality: siteConfig.city,
          addressRegion: siteConfig.region,
          addressCountry: siteConfig.country,
        },
        sameAs: [siteConfig.artistInstagramUrl],
      },
    ],
  };
  return <JsonLdScript data={data} />;
}
