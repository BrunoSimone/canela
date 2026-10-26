import { projectId, apiVersion } from "@/sanity/env";
import { InventoryConflict, type Document, type InventoryDocuments, type Mutation } from "../domain/inventory-store";
import { SanityInventory } from "./sanity-inventory";

export class SanityInventoryDocuments implements InventoryDocuments {
  private readonly base: string;
  constructor(private readonly token: string, private readonly dataset: string, private readonly signal?: AbortSignal) {
    if (!token || !/^[a-z0-9_-]+$/.test(dataset)) throw Error("SANITY_INVENTORY_NOT_CONFIGURED");
    this.base = `https://${projectId}.api.sanity.io/v${apiVersion}/data`;
  }
  private async request(path: string, body?: unknown) {
    const timeout = AbortSignal.timeout(10000);
    const response = await fetch(`${this.base}/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal: this.signal ? AbortSignal.any([this.signal, timeout]) : timeout });
    if (response.status === 409) throw new InventoryConflict();
    if (!response.ok) throw Error(`SANITY_INVENTORY_HTTP_${response.status}`);
    return response.json();
  }
  async get(ids: string[]): Promise<(Document | null)[]> {
    if (!ids.length) return [];
    if (ids.length > 50) {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 50) chunks.push(this.get(ids.slice(i, i + 50)));
      return (await Promise.all(chunks)).flat();
    }
    // /doc reads the document store, and CAS still guards every mutation.
    const data = await this.request(`doc/${this.dataset}/${ids.map(encodeURIComponent).join(",")}`);
    return ids.map(id => data.documents.find((d: Document) => d._id === id) ?? null);
  }
  async commit(mutations: Mutation[]) {
    await this.request(`mutate/${this.dataset}?visibility=sync&returnDocuments=false`, { mutations });
  }
  async query(query: string, params: Record<string, unknown>): Promise<Document[]> {
    const queryParams = new URLSearchParams({ query, perspective: "raw" });
    for (const [key, value] of Object.entries(params)) queryParams.set(`$${key}`, JSON.stringify(value));
    return (await this.request(`query/${this.dataset}?${queryParams}`)).result;
  }
}
export function inventoryStore(signal?: AbortSignal) {
  const name = process.env.SANITY_INVENTORY_DATASET;
  if (!name || (process.env.NODE_ENV !== "production" && name === "production")) throw Error("SANITY_INVENTORY_DATASET_UNSAFE");
  return new SanityInventory(new SanityInventoryDocuments(process.env.SANITY_INVENTORY_TOKEN ?? "", name, signal));
}
