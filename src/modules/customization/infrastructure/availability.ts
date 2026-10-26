export function customizationEnabled(env: { NODE_ENV?: string; VERCEL_ENV?: string; CUADROS_PREVIEW_ENABLED?: string } = process.env): boolean {
  if (env.VERCEL_ENV === "production" || env.CUADROS_PREVIEW_ENABLED === "0") return false;
  return env.NODE_ENV === "development" || env.CUADROS_PREVIEW_ENABLED === "1";
}
