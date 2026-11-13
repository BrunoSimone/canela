import type { SanityImageSource } from "@sanity/image-url";

export type StoreImageSource = SanityImageSource | {assetId:string;url:string;width:number;height:number;alt?:string;hotspot?:{x:number;y:number;width:number;height:number}};

export type Category = "vidrio" | "ceramica" | "espejos";

export interface Product {
  _id: string;
  name: string;
  description?: string | null;
  price: number;
  category: Category;
  sub: string;
  medidas?: string | null;
  material?: string | null;
  images: StoreImageSource[];
  imgLabel?: string;
}

export type StorefrontProduct = Product & { available: boolean };

export interface HeroSlide {
  _id: string;
  name: string;
  caption: string;
  category: Category;
  image: StoreImageSource | null;
  imgLabel?: string;
  tint?: string;
}
