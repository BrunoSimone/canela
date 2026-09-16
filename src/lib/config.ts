const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/+$/, "");

export const siteConfig = {
  name: "Canela Store",
  alternateName: "Canela",
  legalName: "Canela Diseño artesanal",
  descriptor: "Diseño artesanal",
  tagline: "Diseño artesanal · Cerrando el ciclo",
  description:
    "Canela Store ofrece piezas artesanales hechas en Mar del Plata: vidrio " +
    "reciclado y vitrofusión, cerámica, espejos y cuadros, con compra online " +
    "segura mediante Mercado Pago.",
  country: "AR",
  city: "Mar del Plata",
  region: "Buenos Aires",

  url: siteUrl,
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",

  instagram: "@canela_disign_art",
  instagramUrl: "https://www.instagram.com/canela_disign_art/",
  artistInstagramUrl: "https://www.instagram.com/marieladeloso/",

  workshop: {
    name: "Taller de mosaico y vitrofusión Mariela Deloso",
    streetAddress: "Tripulantes del Fournier 4035",
    postalCode: "B7600",
    telephone: "+5492235620255",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        "Taller de mosaico y vitrofusión Mariela Deloso, Tripulantes del Fournier 4035, Mar del Plata",
      ),
  },
} as const;

export function whatsappLink(message: string): string {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WA_GENERAL_MESSAGE =
  "¡Hola! Quería consultar por sus piezas artesanales 🙂";
