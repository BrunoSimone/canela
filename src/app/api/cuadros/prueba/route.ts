import { DemoPurchaseService } from "@/modules/customization/application/demo-purchase";
import { previewCatalog } from "@/modules/customization/infrastructure/format-catalog";
import { frameFormat,type FrameFormat } from "@/modules/customization/domain/formats";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import { demoPurchasePolicy, demoRecipient } from "@/modules/customization/infrastructure/demo-purchase-config";
import { createDemoPurchaseHandler } from "@/modules/customization/presentation/demo-purchase-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const services=new Map<FrameFormat,Promise<DemoPurchaseService>>();
const handler = createDemoPurchaseHandler({
  enabled: demoPurchaseEnabled, recipient: demoRecipient,
  service: (body) => {const format=frameFormat(body?.format),catalog=previewCatalog(format);if(!services.has(format))services.set(format,Promise.all([catalog.configuration(),catalog.pricing()]).then(([config,pricing])=>new DemoPurchaseService(config,pricing,demoPurchasePolicy)));return services.get(format)!;},
});
export const GET = handler;
export const POST = handler;
