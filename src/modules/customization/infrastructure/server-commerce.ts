import { getDatabase } from '@/db/client';
import { readCheckoutConfig } from '@/modules/checkout/infrastructure/server/checkout-config';
import { readMercadoPagoWebhookConfig } from '@/modules/payments/infrastructure/server/webhook-config';
import { MercadoPagoClient } from '@/modules/payments/infrastructure/mercado-pago/client';
import { createShippingDependencies } from '@/modules/shipping/infrastructure/server/shipping-service';
import { FrameCommerce } from '../application/frame-commerce';
import { frameSandboxEnabled } from './commerce-mode';
import { loadFrameWorkshop } from './sanity-workshop';
export function createFrameCommerce() {
  if(!frameSandboxEnabled()) throw Error('FRAME_SALES_LOCKED');
  const config=readCheckoutConfig();
  if(config.mode!=='test'||config.shippingProvider!=='zipnova') throw Error('FRAME_SALES_LOCKED');
  const webhook=readMercadoPagoWebhookConfig();
  if(webhook.environment!=='test') throw Error('FRAME_SALES_LOCKED');
  return new FrameCommerce({sql:getDatabase(),workshop:loadFrameWorkshop,shipping:createShippingDependencies(config.signingSecret),payments:new MercadoPagoClient({accessToken:config.mercadoPagoAccessToken}),siteUrl:config.siteUrl,signingSecret:config.signingSecret});
}
