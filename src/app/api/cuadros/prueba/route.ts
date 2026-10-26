import { DemoPurchaseService } from "@/modules/customization/application/demo-purchase";
import { demoDesignCatalog } from "@/modules/customization/infrastructure/demo-catalog";
import { demoPurchaseEnabled } from "@/modules/customization/infrastructure/demo-purchase-availability";
import { demoPurchasePolicy, demoRecipient } from "@/modules/customization/infrastructure/demo-purchase-config";
import { createDemoPurchaseHandler } from "@/modules/customization/presentation/demo-purchase-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let service: Promise<DemoPurchaseService> | undefined;
const handler = createDemoPurchaseHandler({
  enabled: demoPurchaseEnabled, recipient: demoRecipient,
  service: () => service ??= Promise.all([demoDesignCatalog.configuration(), demoDesignCatalog.pricing()])
    .then(([config, pricing]) => new DemoPurchaseService(config, pricing, demoPurchasePolicy)),
});
export const GET = handler;
export const POST = handler;
