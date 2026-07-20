export const siteConfig = {
  name: "Canela",
  legalName: "Canela — Diseño artesanal",
  descriptor: "Diseño artesanal",
  tagline: "Diseño artesanal · Cerrando el ciclo",
  description:
    "Canela: piezas artesanales de vidrio reciclado y vitrofusión, cerámica " +
    "para la casa y el jardín, espejos y cuadros. Hechas a mano, de forma " +
    "profesional. Consultá por WhatsApp y coordiná el pago con Mercado Pago.",
  country: "AR",

  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",

  instagram: "@canela_diseno_artesanal",
  instagramUrl: "https://www.instagram.com/canela_diseno_artesanal/",
} as const;

export function whatsappLink(message: string): string {
  const base = `https://wa.me/${siteConfig.whatsappNumber}`;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WA_GENERAL_MESSAGE =
  "¡Hola Canela! Quería consultar por sus piezas artesanales 🙂";
