import { getDatabase } from '@/db/client';
import { readCheckoutConfig } from '@/modules/checkout/infrastructure/server/checkout-config';
import { readMercadoPagoWebhookConfig } from '@/modules/payments/infrastructure/server/webhook-config';
import { MercadoPagoClient } from '@/modules/payments/infrastructure/mercado-pago/client';
import { createShippingDependencies } from '@/modules/shipping/infrastructure/server/shipping-service';
import { FrameCommerce } from '../application/frame-commerce';
import { frameCommerceMode } from './commerce-mode';
import { loadFrameWorkshop } from './frame-catalog';
export function createFrameCommerce() {
  const mode=frameCommerceMode();
  if(!mode) throw Error('FRAME_SALES_LOCKED');
  const config=readCheckoutConfig();
  if(config.mode!==(mode==='sandbox'?'test':'production')||config.shippingProvider!=='zipnova') throw Error('FRAME_SALES_LOCKED');
  const webhook=readMercadoPagoWebhookConfig();
  if(webhook.environment!==config.mode) throw Error('FRAME_SALES_LOCKED');
  return new FrameCommerce({sql:getDatabase(),environment:config.mode,workshop:loadFrameWorkshop,shipping:createShippingDependencies(config.signingSecret),payments:new MercadoPagoClient({accessToken:config.mercadoPagoAccessToken}),siteUrl:config.siteUrl,signingSecret:config.signingSecret});
}
