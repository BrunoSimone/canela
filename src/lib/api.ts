import { client } from "@/sanity/client";
import type { Category, HeroSlide, Product } from "@/lib/types";

const PRODUCTS_QUERY = `*[_type == "producto"] | order(orderRank asc) {
  _id,
  name,
  price,
  category,
  sub,
  tone,
  statusNote,
  images
}`;

const HERO_QUERY = `*[_type == "heroSlide"] | order(orderRank asc) {
  _id,
  name,
  caption,
  category,
  image
}`;

export async function getProducts(): Promise<Product[]> {
  try {
    return await client.fetch<Product[]>(
      PRODUCTS_QUERY,
      {},
      { next: { revalidate: 60 } },
    );
  } catch {
    return [];
  }
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    return await client.fetch<HeroSlide[]>(HERO_QUERY, {}, {
      next: { revalidate: 60 },
    });
  } catch {
    return [];
  }
}

export function groupByCategory(
  products: Product[],
): Record<Category, Product[]> {
  const groups: Record<Category, Product[]> = { vidrio: [], ceramica: [], espejos: [] };
  for (const p of products) {
    if (groups[p.category]) groups[p.category].push(p);
  }
  return groups;
}
