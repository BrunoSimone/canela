import type { Sql } from "postgres";
import { CatalogRepository } from "./catalog-repository";
import {
  MediaRepository,
  renderKey,
} from "@/modules/media/infrastructure/media-repository";
import type { Product, HeroSlide } from "@/lib/types";
import { parseShippingProfile } from "@/modules/shipping/infrastructure/sanity/sanity-shipping-profile-catalog";
import {
  validateBox,
  type ShippingBox,
} from "@/modules/shipping/domain/shared-box-plan";
import type { ProductCatalog } from "../../domain/product-catalog";
export class DatabaseProductCatalog implements ProductCatalog {
  constructor(private sql: Sql) {}
  async findByIds(ids: string[]) {
    return (
      await new CatalogRepository(this.sql).publicEntries("product", ids)
    ).map((r) => ({
      id: r.id,
      name: r.published!.name!,
      priceArs: r.published!.price!,
      sellable: true,
    }));
  }
}
export class DatabaseShippingProfiles {
  constructor(private sql: Sql) {}
  async findByIds(ids: string[]) {
    return (
      await new CatalogRepository(this.sql).publicEntries("product", ids)
    ).map((r) => ({
      id: r.id,
      sellable: true,
      profile: parseShippingProfile(
        r.id,
        r.published!.shippingProfile,
        String(r.version),
      ),
    }));
  }
}
export class DatabaseShippingBoxes {
  constructor(private sql: Sql) {}
  async list() {
    const boxes = (await new CatalogRepository(this.sql).publicEntries("box"))
      .filter((r) => r.published!.active)
      .map(
        (r) =>
          ({
            ...r.published,
            id: r.id,
            revision: String(r.version),
          }) as ShippingBox,
      );
    boxes.forEach(validateBox);
    return boxes;
  }
}
export async function databaseProducts(sql: Sql): Promise<Product[]> {
  const entries = await new CatalogRepository(sql).publicEntries("product"),
    images = await new MediaRepository(sql).publicImages(
      entries.map((r) => r.published!),
    );
  return entries.map((r) => {
    const d = r.published!;
    return {
      _id: r.id,
      name: d.name!,
      price: d.price!,
      description: d.description,
      category: d.category as Product["category"],
      sub: d.sub!,
      medidas: d.medidas,
      material: d.material,
      images: (d.images ?? []).flatMap((i) => {
        const image = images.get(renderKey(i));
        return image ? [image] : [];
      }),
    };
  });
}
export async function databaseSlides(sql: Sql): Promise<HeroSlide[]> {
  const entries = await new CatalogRepository(sql).publicEntries("slide"),
    images = await new MediaRepository(sql).publicImages(
      entries.map((r) => r.published!),
    );
  return entries.map((r) => {
    const d = r.published!;
    return {
      _id: r.id,
      name: d.name!,
      caption: d.caption!,
      category: d.category as HeroSlide["category"],
      image: d.image ? (images.get(renderKey(d.image)) ?? null) : null,
    };
  });
}
