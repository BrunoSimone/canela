import type { MosaicDesign } from './design';
import type { DemoRecipient } from './purchase';
import type { CourierQuoteSnapshot } from '@/modules/shipping/domain/courier-quote';
export type FrameSnapshot = {
  design: MosaicDesign; materials: Record<string,string>; priceCents:number;
  workshopFingerprint:string; productionDays:number; capacity:number;
  terms:{version:string;text:string};
  acceptance:{at:string;gallery:boolean};
};
export type FrameQuote = {environment:'test'|'production';id:string;expiresAt:string;snapshot:FrameSnapshot;recipient:DemoRecipient;shipping:CourierQuoteSnapshot};
export type ProductionState = 'awaiting_payment'|'queued'|'making'|'ready';
export type AdminFrame = {state:ProductionState;version:number;design?:MosaicDesign;productionDays:number;galleryConsent:boolean;galleryDraftCreated:boolean};
