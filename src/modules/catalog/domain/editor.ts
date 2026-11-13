import { CONTENT_CLASSIFICATIONS } from "@/modules/shipping/domain/content-classifications";
import { validateDesign } from "@/modules/customization/domain/design";
import {
  validateBox,
  type ShippingBox,
} from "@/modules/shipping/domain/shared-box-plan";

export const catalogKinds = ["product", "slide", "box", "frame"] as const;
export type CatalogKind = (typeof catalogKinds)[number];
export type ImageCrop = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};
export type ImageHotspot = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type CatalogImage = {
  assetId: string;
  crop?: ImageCrop;
  hotspot?: ImageHotspot;
  alt?: string;
};
export type CatalogDocument = {
  name?: string;
  description?: string;
  category?: string;
  sub?: string;
  price?: number | null;
  medidas?: string;
  material?: string;
  images?: CatalogImage[];
  image?: CatalogImage | null;
  caption?: string;
  title?: string;
  designJson?: string;
  active?: boolean;
  shippingProfile?: {
    version?: number;
    weightGrams?: number | null;
    heightCm?: number | null;
    widthCm?: number | null;
    lengthCm?: number | null;
    classificationId?: string;
    canRotate?: boolean;
    canStack?: boolean;
    shipSeparately?: boolean;
  } | null;
  innerHeightCm?: number | null;
  innerWidthCm?: number | null;
  innerLengthCm?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  lengthCm?: number | null;
  tareWeightGrams?: number | null;
  maxWeightGrams?: number | null;
};
export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
  }
}
export const categories: Record<string, string[]> = {
  vidrio: ["Reciclado", "Vitrofusión"],
  ceramica: ["Casa", "Jardín"],
  espejos: ["Espejos", "Cuadros"],
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function parseCatalogImage(v: unknown): CatalogImage {
  if (
    !record(v) ||
    typeof v.assetId !== "string" ||
    !/^[a-f0-9]{64}$/.test(v.assetId)
  )
    throw new CatalogError("La foto no tiene una referencia válida.");
  const result: CatalogImage = { assetId: v.assetId };
  if (v.alt !== undefined) {
    if (typeof v.alt !== "string" || v.alt.length > 180)
      throw new CatalogError("Revisá la descripción de la foto.");
    result.alt = v.alt;
  }
  if (v.crop !== undefined) {
    const c = v.crop;
    if (
      !record(c) ||
      !["top", "bottom", "left", "right"].every(
        (k) =>
          typeof c[k] === "number" &&
          Number.isFinite(c[k]) &&
          c[k] >= 0 &&
          c[k] < 1,
      ) ||
      Number(c.top) + Number(c.bottom) >= 1 ||
      Number(c.left) + Number(c.right) >= 1
    )
      throw new CatalogError("El recorte debe conservar parte de la foto.");
    result.crop = {
      top: Number(c.top),
      bottom: Number(c.bottom),
      left: Number(c.left),
      right: Number(c.right),
    };
  }
  if (v.hotspot !== undefined) {
    const h = v.hotspot;
    if (
      !record(h) ||
      !["x", "y", "width", "height"].every(
        (k) =>
          typeof h[k] === "number" &&
          Number.isFinite(h[k]) &&
          h[k] >= 0 &&
          h[k] <= 1,
      )
    )
      throw new CatalogError("Revisá el punto focal.");
    result.hotspot = {
      x: Number(h.x),
      y: Number(h.y),
      width: Number(h.width),
      height: Number(h.height),
    };
  }
  return result;
}
export function parseCatalogDocument(
  kind: CatalogKind,
  input: unknown,
  publish = false,
): CatalogDocument {
  if (
    !catalogKinds.includes(kind) ||
    !record(input) ||
    JSON.stringify(input).length > 230000
  )
    throw new CatalogError("El documento no es válido.");
  const d: CatalogDocument = {};
  const strings = [
    "name",
    "description",
    "category",
    "sub",
    "medidas",
    "material",
    "caption",
    "title",
    "designJson",
  ] as const;
  for (const k of strings)
    if (input[k] != null) {
      if (
        typeof input[k] !== "string" ||
        input[k].length >
          (k === "designJson" ? 200000 : k === "description" ? 4000 : 200)
      )
        throw new CatalogError(`Revisá el campo ${k}.`);
      d[k] = input[k].trim();
    }
  for (const k of [
    "price",
    "innerHeightCm",
    "innerWidthCm",
    "innerLengthCm",
    "heightCm",
    "widthCm",
    "lengthCm",
    "tareWeightGrams",
    "maxWeightGrams",
  ] as const)
    if (input[k] !== undefined) {
      const n = input[k];
      if (
        n !== null &&
        (typeof n !== "number" ||
          !Number.isFinite(n) ||
          n < 0 ||
          n > 10000000 ||
          (k !== "price" && !Number.isSafeInteger(n)))
      )
        throw new CatalogError("Revisá precios, pesos y medidas.");
      d[k] = n as number | null;
    }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean")
      throw new CatalogError("Revisá la disponibilidad de la caja.");
    d.active = input.active;
  }
  if (input.images !== undefined) {
    if (!Array.isArray(input.images) || input.images.length > 20)
      throw new CatalogError("Podés cargar hasta 20 fotos por producto.");
    d.images = input.images.map(parseCatalogImage);
  }
  if (input.image != null) d.image = parseCatalogImage(input.image);
  if (input.shippingProfile != null) {
    const p = input.shippingProfile;
    if (!record(p)) throw new CatalogError("Revisá los datos de envío.");
    const s: NonNullable<CatalogDocument["shippingProfile"]> = { version: 1 };
    for (const k of [
      "weightGrams",
      "heightCm",
      "widthCm",
      "lengthCm",
    ] as const) {
      const n = p[k];
      if (
        n !== undefined &&
        n !== null &&
        (!Number.isSafeInteger(n) || Number(n) < 0 || Number(n) > 10000000)
      )
        throw new CatalogError("Revisá las medidas de la pieza protegida.");
      s[k] = n == null ? null : Number(n);
    }
    for (const k of ["canRotate", "canStack", "shipSeparately"] as const) {
      if (p[k] !== undefined && typeof p[k] !== "boolean")
        throw new CatalogError("Revisá el acomodo de la pieza.");
      s[k] = p[k] === true;
    }
    if (p.classificationId != null) {
      if (
        typeof p.classificationId !== "string" ||
        !["", ...CONTENT_CLASSIFICATIONS.map((c) => c.value)].includes(
          p.classificationId,
        )
      )
        throw new CatalogError("Elegí el contenido del envío.");
      s.classificationId = p.classificationId;
    }
    d.shippingProfile = s;
  }
  if (publish) {
    if (kind === "product") {
      if (
        !d.name ||
        !d.category ||
        !categories[d.category]?.includes(d.sub ?? "") ||
        !d.images?.length ||
        typeof d.price !== "number" ||
        d.price <= 0 ||
        Math.abs(d.price * 100 - Math.round(d.price * 100)) > 0.0001
      )
        throw new CatalogError(
          "Completá nombre, categoría, subcategoría, precio y al menos una foto.",
        );
      const p = d.shippingProfile;
      if (
        !p ||
        ![p.weightGrams, p.heightCm, p.widthCm, p.lengthCm].every(
          (n) => Number.isSafeInteger(n) && Number(n) > 0,
        ) ||
        !p.classificationId
      )
        throw new CatalogError(
          "Completá peso, las tres medidas con protección y contenido del envío.",
        );
    } else if (kind === "slide") {
      if (!d.name || !d.caption || !d.image || !categories[d.category ?? ""])
        throw new CatalogError(
          "Completá nombre, etiqueta, categoría y foto del carrusel.",
        );
    } else if (kind === "box") {
      try {
        validateBox({ ...d, id: "validation", revision: "1" } as ShippingBox);
      } catch {
        throw new CatalogError(
          "Revisá nombre, medidas interiores/exteriores y peso de la caja.",
        );
      }
    } else {
      if (!d.title || !d.designJson)
        throw new CatalogError("Completá el título y el diseño.");
      try {
        validateDesign(JSON.parse(d.designJson));
      } catch {
        throw new CatalogError("El diseño del cuadro no es válido.");
      }
    }
  }
  return d;
}
export function imageReferences(d: CatalogDocument): CatalogImage[] {
  return [...(d.images ?? []), ...(d.image ? [d.image] : [])];
}

/** Stable across JSONB key ordering; used by the panel for distinct crops of a shared asset. */
export function imageReferenceKey(image: CatalogImage): string {
  const c = image.crop;
  return JSON.stringify([
    image.assetId,
    c?.top ?? 0,
    c?.bottom ?? 0,
    c?.left ?? 0,
    c?.right ?? 0,
  ]);
}
export function publicationIssue(
  kind: CatalogKind,
  document: CatalogDocument,
): string | null {
  try {
    parseCatalogDocument(kind, document, true);
    return null;
  } catch (e) {
    return e instanceof CatalogError
      ? e.message
      : "Revisá los datos de la ficha.";
  }
}
