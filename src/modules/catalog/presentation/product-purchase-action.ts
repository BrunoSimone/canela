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
  tone,
}: ProductPurchaseActionInput): ProductPurchaseAction {
  if (tone !== "encargo") {
    return {
      containerLabel: "En tu carrito",
      idleLabel: "Agregar al carrito",
      selectedLabel: `En tu carrito · ${Math.max(quantity, 1)}`,
    };
  }

  return {
    containerLabel: "En tu consulta",
    idleLabel: "Agregar a mi consulta",
    selectedLabel: `En tu consulta · ${Math.max(quantity, 1)}`,
  };
}
