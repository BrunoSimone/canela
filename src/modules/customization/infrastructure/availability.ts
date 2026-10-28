export function customizationEnabled(env: { NODE_ENV?: string; VERCEL_ENV?: string; CUADROS_PREVIEW_ENABLED?: string } = process.env): boolean {
  if (env.CUADROS_PREVIEW_ENABLED === "0") return false;
  if (env.VERCEL_ENV === "production") return env.CUADROS_PREVIEW_ENABLED === "1";
  return env.NODE_ENV === "development" || env.CUADROS_PREVIEW_ENABLED === "1";
}
