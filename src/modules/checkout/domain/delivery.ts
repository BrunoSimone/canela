export const ARGENTINE_PROVINCES = [
  { code: "A", name: "Salta" },
  { code: "B", name: "Buenos Aires" },
  { code: "C", name: "Ciudad Autónoma de Buenos Aires" },
  { code: "D", name: "San Luis" },
  { code: "E", name: "Entre Ríos" },
  { code: "F", name: "La Rioja" },
  { code: "G", name: "Santiago del Estero" },
  { code: "H", name: "Chaco" },
  { code: "J", name: "San Juan" },
  { code: "K", name: "Catamarca" },
  { code: "L", name: "La Pampa" },
  { code: "M", name: "Mendoza" },
  { code: "N", name: "Misiones" },
  { code: "P", name: "Formosa" },
  { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" },
  { code: "S", name: "Santa Fe" },
  { code: "T", name: "Tucumán" },
  { code: "U", name: "Chubut" },
  { code: "V", name: "Tierra del Fuego" },
  { code: "W", name: "Corrientes" },
  { code: "X", name: "Córdoba" },
  { code: "Y", name: "Jujuy" },
  { code: "Z", name: "Santa Cruz" },
] as const;

export type ProvinceCode = (typeof ARGENTINE_PROVINCES)[number]["code"];

export type DeliverySnapshot = {
  type: "home";
  buyerName: string;
  recipientName: string;
  phone: string | null;
  recipientDocument?: string | null;
  streetName: string;
  streetNumber: string;
  floor: string | null;
  apartment: string | null;
  city: string;
  provinceCode: ProvinceCode;
  postalCode: string;
};

export class InvalidDeliveryError extends Error {
  constructor() {
    super("Delivery details are invalid");
    this.name = "InvalidDeliveryError";
  }
}

export function provinceName(code: string): string | null {
  return ARGENTINE_PROVINCES.find((province) => province.code === code)?.name ?? null;
}

const deliveryParsers = {
  buyerName: (value: unknown) => line(value, 2, 100),
  recipientName: (value: unknown) => line(value, 2, 100),
  streetName: (value: unknown) => line(value, 2, 100),
  city: (value: unknown) => line(value, 2, 100),
  floor: (value: unknown) => optionalLine(value, 3),
  apartment: (value: unknown) => optionalLine(value, 3),
  provinceCode: (value: unknown): ProvinceCode => {
    if (typeof value !== "string" || !provinceName(value)) throw new InvalidDeliveryError();
    return value as ProvinceCode;
  },
  postalCode: (value: unknown) => {
    const result = line(value, 4, 4);
    if (!/^[1-9]\d{3}$/.test(result)) throw new InvalidDeliveryError();
    return result;
  },
  streetNumber: (value: unknown) => {
    const result = line(value, 1, 12);
    if (!/^[\p{L}\p{N}\s/-]+$/u.test(result)) throw new InvalidDeliveryError();
    return result;
  },
  phone: (value: unknown) => {
    const result = optionalLine(value, 24);
    if (result && (!/^\+?[\d\s()-]+$/.test(result) || result.replace(/\D/g, "").length < 7)) throw new InvalidDeliveryError();
    return result;
  },
  recipientDocument: (value: unknown) => {
    const result = optionalLine(value, 20);
    if (result && !/^[A-Za-z0-9]{5,20}$/.test(result)) throw new InvalidDeliveryError();
    return result;
  },
};
export type DeliveryField = keyof typeof deliveryParsers;

// The field feedback and the HTTP parser use the same normalization and rules.
export function isDeliveryFieldValid(field: DeliveryField, value: unknown): boolean {
  try { deliveryParsers[field](value); return true; }
  catch (error) { if (error instanceof InvalidDeliveryError) return false; throw error; }
}

export function parseDeliverySnapshot(value: unknown): DeliverySnapshot {
  if (!isRecord(value) || value.type !== "home") throw new InvalidDeliveryError();
  const recipientDocument = deliveryParsers.recipientDocument(value.recipientDocument);
  return {
    type: "home",
    buyerName: deliveryParsers.buyerName(value.buyerName),
    recipientName: deliveryParsers.recipientName(value.recipientName),
    phone: deliveryParsers.phone(value.phone),
    ...(recipientDocument ? { recipientDocument } : {}),
    streetName: deliveryParsers.streetName(value.streetName),
    streetNumber: deliveryParsers.streetNumber(value.streetNumber),
    floor: deliveryParsers.floor(value.floor),
    apartment: deliveryParsers.apartment(value.apartment),
    city: deliveryParsers.city(value.city),
    provinceCode: deliveryParsers.provinceCode(value.provinceCode),
    postalCode: deliveryParsers.postalCode(value.postalCode),
  };
}

function line(value: unknown, min: number, max: number): string {
  if (typeof value !== "string") throw new InvalidDeliveryError();
  const normalized = value.normalize("NFC").trim().replace(/\s+/g, " ");
  if (normalized.length < min || normalized.length > max || /[\p{Cc}\p{Cf}]/u.test(normalized)) {
    throw new InvalidDeliveryError();
  }
  return normalized;
}

function optionalLine(value: unknown, max: number): string | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  return line(value, 1, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
