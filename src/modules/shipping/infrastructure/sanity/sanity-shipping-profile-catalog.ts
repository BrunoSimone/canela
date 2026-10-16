import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../../../../sanity/env";
import type { ShippingProfile } from "../../domain/parcel-plan";

const SHIPPING_PROFILES_QUERY = `*[
  _type == "producto" && _id in $productIds
] {
  "id": _id,
  tone,
  _rev,
  shippingProfile {
    version,
    canRotate,
    canStack,
    weightGrams,
    heightCm,
    widthCm,
    lengthCm,
    shipSeparately,
    classificationId
  }
}`;

type SanityShippingProfileReader = {
  fetch(
    query: string,
    params: { productIds: string[] },
    options: { cache: "no-store"; perspective: "published" },
  ): Promise<unknown>;
};

export type ShippingCatalogProduct = {
  id: string;
  sellable: boolean;
  profile: ShippingProfile | null;
};

const authoritativeReader = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
});

export class SanityShippingProfileCatalog {
  constructor(
    private readonly reader: SanityShippingProfileReader = authoritativeReader,
  ) {}

  async findByIds(productIds: string[]): Promise<ShippingCatalogProduct[]> {
    const result = await this.reader.fetch(
      SHIPPING_PROFILES_QUERY,
      { productIds },
      { cache: "no-store", perspective: "published" },
    );
    if (!Array.isArray(result)) {
      throw new Error("Sanity returned an invalid shipping catalog response");
    }
    return result.map(parseProduct);
  }
}

function parseProduct(value: unknown): ShippingCatalogProduct {
  if (!isRecord(value) || typeof value.id !== "string" ||
    typeof value.tone !== "string") {
    throw new Error("Sanity returned an invalid shipping product");
  }
  return {
    id: value.id,
    sellable: value.tone === "unica" || value.tone === "stock",
    profile: parseProfile(value.id, value.shippingProfile, typeof value._rev === "string" ? value._rev : undefined),
  };
}

function parseProfile(productId: string, value: unknown, revision?: string): ShippingProfile | null {
  if (value === null || value === undefined) return null;
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.version ?? 1) ||
    !Number.isSafeInteger(value.weightGrams) ||
    !Number.isSafeInteger(value.heightCm) ||
    !Number.isSafeInteger(value.widthCm) ||
    !Number.isSafeInteger(value.lengthCm) ||
    (value.shipSeparately != null && typeof value.shipSeparately !== "boolean")
  ) {
    throw new Error(`Sanity returned an invalid shipping profile for ${productId}`);
  }
  return {
    productId,
    ...(revision ? { revision } : {}),
    ...(value.canRotate === true ? { canRotate: true } : {}),
    ...(value.canStack === true ? { canStack: true } : {}),
    version: (value.version ?? 1) as number,
    weightGrams: value.weightGrams as number,
    heightCm: value.heightCm as number,
    widthCm: value.widthCm as number,
    lengthCm: value.lengthCm as number,
    shipSeparately: value.shipSeparately === true,
    ...(typeof value.classificationId === "string" && /^[A-Za-z0-9_-]{1,50}$/.test(value.classificationId) ? { classificationId: value.classificationId } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
