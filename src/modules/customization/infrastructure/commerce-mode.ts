export type FrameCommerceMode = 'sandbox' | 'production';
/** Runtime configuration gate. Workshop approvals are checked separately before each new purchase. */
export function frameCommerceMode(env: Record<string,string|undefined> = process.env): FrameCommerceMode | null {
  if (env.CUADROS_PREVIEW_ENABLED === '0' || env.SHIPPING_PROVIDER !== 'zipnova') return null;
  if (env.CUADROS_CHECKOUT_MODE === 'sandbox' && env.VERCEL_ENV !== 'production' &&
      env.PAYMENT_ENVIRONMENT === 'test' && env.CHECKOUT_MODE === 'test' && env.ZIPNOVA_ACCOUNT_MODE === 'sandbox') return 'sandbox';
  if (env.CUADROS_CHECKOUT_MODE === 'production' && env.CUADROS_CATALOG_SOURCE === 'database' &&
      env.PAYMENT_ENVIRONMENT === 'production' && env.CHECKOUT_MODE === 'production' &&
      env.COMMERCE_PRODUCTION_APPROVED === '1' && env.ZIPNOVA_ACCOUNT_MODE === 'operational' &&
      env.ZIPNOVA_FULFILLMENT_MODE === 'production') return 'production';
  return null;
}
export function frameCommerceEnabled(env: Record<string,string|undefined> = process.env): boolean {
  return frameCommerceMode(env) !== null;
}
