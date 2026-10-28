import { frameCommerceEnabled } from '@/modules/customization/infrastructure/commerce-mode';
import { createFrameCommerce } from '@/modules/customization/infrastructure/server-commerce';
import { frameCommerceHandler } from '@/modules/customization/presentation/frame-commerce-http';
export const runtime='nodejs';
export const POST=frameCommerceHandler({enabled:frameCommerceEnabled,service:createFrameCommerce});
