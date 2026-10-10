import type { ProductTone } from "@/lib/types";

type ProductPurchaseActionInput = {
  quantity: number;
  tone: ProductTone;
};

type ProductPurchaseAction = {
  containerLabel: string;
  idleLabel: string;
  selectedLabel: string;
};

export function describeProductPurchaseAction({
  quantity,
}: ProductPurchaseActionInput): ProductPurchaseAction {
  return {
    containerLabel: "En tu carrito",
    idleLabel: "Agregar al carrito",
    selectedLabel: `En tu carrito · ${Math.max(quantity, 1)}`,
  };
}
