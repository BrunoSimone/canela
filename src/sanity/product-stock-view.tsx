import { useCallback, useEffect, useState } from "react";
import { useClient, useSource } from "sanity";
import { InventoryClient } from "../modules/inventory/presentation/inventory-client";

export function ProductStockView({ documentId }: { documentId: string }) {
  const source = useSource();
  const client = useClient({ apiVersion: "2025-01-01" });
  const [token, setToken] = useState<string | null>(client.config().token ?? null);
  useEffect(() => {
    const subscription = source.auth.token?.subscribe(setToken);
    return () => subscription?.unsubscribe();
  }, [source.auth]);
  const request = useCallback((path: string, options?: RequestInit) => {
    // Only the user's own Sanity session is forwarded. Server API keys never enter Studio.
    const api = window.location.hostname === "localhost" ? "http://localhost:3000" : "https://www.canela-store.com";
    return fetch(`${api}/api/studio/inventory${path}`, { ...options, credentials: "omit", headers: { ...options?.headers, Authorization: `Bearer ${token}` } });
  }, [token]);
  if (!token) return <p style={{ padding: 24 }}>Volvé a ingresar a Sanity para consultar y ajustar el stock.</p>;
  return <InventoryClient request={request} productId={documentId.replace(/^drafts\./, "")} />;
}
