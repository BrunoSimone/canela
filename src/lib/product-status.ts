import type { ProductTone } from "@/lib/types";

interface ToneStyle {
  bg: string;
  color: string;
  label: string;
}

const TONE_MAP: Record<ProductTone, ToneStyle> = {
  unica: { bg: "#F0E1B6", color: "#7d5a12", label: "Pieza única" },
  stock: { bg: "#DBE6C0", color: "#4c5926", label: "En stock" },
  encargo: { bg: "#F3DBBD", color: "#8a4e18", label: "Por encargo" },
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
