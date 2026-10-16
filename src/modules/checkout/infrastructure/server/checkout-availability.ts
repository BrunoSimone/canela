import { readShippingConfig } from "../../../shipping/infrastructure/server/shipping-config";
import { readCheckoutConfig } from "./checkout-config";

export function isCheckoutReady(): boolean {
  try {
    const config = readCheckoutConfig();
    if (config.mode === "disabled") return false;
    if (config.shippingProvider === "zipnova") readShippingConfig();
    return true;
  } catch {
    return false;
  }
}
