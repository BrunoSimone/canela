type ProductPurchaseActionInput = { quantity: number; available: boolean };

export function describeProductPurchaseAction({ quantity, available }: ProductPurchaseActionInput) {
  return {
    disabled: !available,
    containerLabel: "En tu carrito",
    idleLabel: available ? "Agregar al carrito" : "Agotado",
    selectedLabel: available ? `En tu carrito · ${Math.max(quantity, 1)}` : "Agotado",
  };
}
