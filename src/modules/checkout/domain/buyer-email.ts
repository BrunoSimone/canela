/** Shared by the checkout form and the HTTP boundary. */
export function isBuyerEmailValid(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
