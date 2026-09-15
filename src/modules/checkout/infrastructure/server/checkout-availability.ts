import { readCheckoutConfig } from "./checkout-config";

export function isControlledCheckoutReady(): boolean {
  try {
    return readCheckoutConfig().mode === "test";
  } catch {
    return false;
  }
}
