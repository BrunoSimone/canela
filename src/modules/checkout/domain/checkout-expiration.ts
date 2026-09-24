export const CHECKOUT_EXPIRATION = {
  minutes: 10,
  mercadoPagoDuration: "PT10M",
} as const;

export function checkoutExpiresAt(startedAt: Date): Date {
  return new Date(
    startedAt.getTime() + CHECKOUT_EXPIRATION.minutes * 60 * 1000,
  );
}
