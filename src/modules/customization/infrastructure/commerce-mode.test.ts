import { describe, it, expect } from 'vitest';
import { frameCommerceMode } from './commerce-mode';
const live = { CUADROS_CHECKOUT_MODE:'production', CUADROS_PREVIEW_ENABLED:'1', CUADROS_CATALOG_SOURCE:'database', PAYMENT_ENVIRONMENT:'production', CHECKOUT_MODE:'production', COMMERCE_PRODUCTION_APPROVED:'1', SHIPPING_PROVIDER:'zipnova', ZIPNOVA_ACCOUNT_MODE:'operational', ZIPNOVA_FULFILLMENT_MODE:'production' };
describe('PER-148 commerce environments', () => {
 it('accepts explicitly aligned production and refuses every mixed or unapproved configuration', () => {
  expect(frameCommerceMode(live)).toBe('production');
  for (const change of [{CUADROS_CHECKOUT_MODE:'disabled'},{CUADROS_CHECKOUT_MODE:'invalid'},{CUADROS_PREVIEW_ENABLED:'0'},{CUADROS_CATALOG_SOURCE:'fixtures'},{PAYMENT_ENVIRONMENT:'test'},{CHECKOUT_MODE:'test'},{COMMERCE_PRODUCTION_APPROVED:'0'},{SHIPPING_PROVIDER:'controlled_test'},{ZIPNOVA_ACCOUNT_MODE:'sandbox'},{ZIPNOVA_FULFILLMENT_MODE:'disabled'}]) expect(frameCommerceMode({...live,...change})).toBeNull();
 });
 it('never enables sandbox on a production deployment or a live shipping account', () => {
  const test={CUADROS_CHECKOUT_MODE:'sandbox',CHECKOUT_MODE:'test',PAYMENT_ENVIRONMENT:'test',SHIPPING_PROVIDER:'zipnova',ZIPNOVA_ACCOUNT_MODE:'sandbox'};
  expect(frameCommerceMode(test)).toBe('sandbox');
  expect(frameCommerceMode({...test,VERCEL_ENV:'production'})).toBeNull();
  expect(frameCommerceMode({...test,ZIPNOVA_ACCOUNT_MODE:'operational'})).toBeNull();
  expect(frameCommerceMode({})).toBeNull();
 });
});
