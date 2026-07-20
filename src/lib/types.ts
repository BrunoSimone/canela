import type { SanityImageSource } from "@sanity/image-url";

export type Category = "vidrio" | "ceramica" | "espejos";

export type ProductTone = "unica" | "stock" | "encargo";

export interface Product {
  _id: string;
  name: string;
  price: number;
  category: Category;
  sub: string;
  tone: ProductTone;
  statusNote?: string | null;
  images: SanityImageSource[];
  imgLabel?: string;
}

export interface HeroSlide {
  _id: string;
  name: string;
  caption: string;
  category: Category;
  image: SanityImageSource | null;
  imgLabel?: string;
  tint?: string;
}
