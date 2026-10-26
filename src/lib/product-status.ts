const ARS = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatPrice(price: number): string {
  return `$${ARS.format(price)}`;
}
