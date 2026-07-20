import type { Metadata } from "next";
import { Grand_Hotel, Mulish } from "next/font/google";
import "./globals.css";

import { StoreJsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/lib/config";

const grandHotel = Grand_Hotel({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const mulish = Mulish({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — Artesanías en vidrio, cerámica y espejos`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.descriptor}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${mulish.variable} ${grandHotel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <StoreJsonLd />
      </body>
    </html>
  );
}
