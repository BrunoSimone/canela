import { customizationEnabled } from "./availability";
export function demoPurchaseEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "development" && !env.VERCEL_ENV && customizationEnabled(env);
}
