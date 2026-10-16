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

export function parseDeliverySnapshot(value: unknown): DeliverySnapshot {
  if (!isRecord(value) || value.type !== "home") throw new InvalidDeliveryError();
  const provinceCode = value.provinceCode;
  if (typeof provinceCode !== "string" || !provinceName(provinceCode)) {
    throw new InvalidDeliveryError();
  }
  const postalCode = line(value.postalCode, 4, 4);
  const streetNumber = line(value.streetNumber, 1, 12);
  if (!/^[1-9]\d{3}$/.test(postalCode) || !/^[\p{L}\p{N}\s/-]+$/u.test(streetNumber)) {
    throw new InvalidDeliveryError();
  }
  const phone = optionalLine(value.phone, 24);
  if (phone && (!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g, "").length < 7)) {
    throw new InvalidDeliveryError();
  }
  const recipientDocument = optionalLine(value.recipientDocument, 20);
  if (recipientDocument && !/^[A-Za-z0-9]{5,20}$/.test(recipientDocument)) throw new InvalidDeliveryError();
  return {
    type: "home",
    buyerName: line(value.buyerName, 2, 100),
    recipientName: line(value.recipientName, 2, 100),
    phone,
    ...(recipientDocument ? { recipientDocument } : {}),
    streetName: line(value.streetName, 2, 100),
    streetNumber,
    floor: optionalLine(value.floor, 3),
    apartment: optionalLine(value.apartment, 3),
    city: line(value.city, 2, 100),
    provinceCode: provinceCode as ProvinceCode,
    postalCode,
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
