export function privateWorkshopDataset(value: string | undefined, catalogDataset: string): string {
  if (!value || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(value) || value === catalogDataset || value === "production") {
    throw Error("A separate private Sanity dataset is required for the workshop");
  }
  return value;
}
export async function requirePrivateDataset(client: { datasets: { list(): Promise<{ name: string; aclMode: string }[]> } }, name: string) {
  const datasets = await client.datasets.list();
  if (datasets.find(dataset => dataset.name === name)?.aclMode !== "private") throw Error("The Sanity workshop dataset must be private");
}
