export function resolveCatalogDataset(value?: string, vercelEnvironment?: string): string {
  const selected = value ?? "production";
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(selected)) {
    throw new Error("Invalid Sanity catalog dataset");
  }
  if (vercelEnvironment === "production" && selected !== "production") {
    throw new Error("Production requires the production Sanity catalog");
  }
  return selected;
}
