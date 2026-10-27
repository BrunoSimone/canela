/** Production is deliberately unavailable in PER-146, including with stock checkout flags. */
export function frameSandboxEnabled(env: Record<string,string|undefined> = process.env): boolean {
  return env.CUADROS_CHECKOUT_MODE === 'sandbox' && env.VERCEL_ENV !== 'production' &&
    env.PAYMENT_ENVIRONMENT === 'test' && env.CHECKOUT_MODE === 'test' &&
    env.ZIPNOVA_ACCOUNT_MODE === 'sandbox' && env.SHIPPING_PROVIDER === 'zipnova' &&
    env.CUADROS_PREVIEW_ENABLED !== '0';
}
