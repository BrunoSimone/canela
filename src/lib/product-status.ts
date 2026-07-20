import type { ProductTone } from "@/lib/types";

interface ToneStyle {
  bg: string;
  color: string;
  label: string;
}

const TONE_MAP: Record<ProductTone, ToneStyle> = {
  unica: { bg: "rgba(184,132,42,.16)", color: "#8a621d", label: "Pieza única" },
  stock: { bg: "rgba(122,138,70,.20)", color: "#566030", label: "En stock" },
  encargo: { bg: "rgba(206,154,91,.24)", color: "#8a5525", label: "Por encargo" },
};

export function toneStyle(tone: ProductTone): ToneStyle {
  return TONE_MAP[tone] ?? TONE_MAP.stock;
}

export function statusLabel(tone: ProductTone, statusNote?: string | null): string {
  return statusNote?.trim() || toneStyle(tone).label;
}

const ARS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatPrice(price: number): string {
  return `$${ARS.format(price)}`;
}
