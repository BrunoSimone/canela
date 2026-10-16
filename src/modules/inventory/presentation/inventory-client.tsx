"use client";
import { useEffect, useState } from "react";
import type { InventoryRow } from "../domain/stock-edit";
import styles from "./inventory.module.css";

const messages: Record<string, string> = {
  STOCK_CHANGED: "El stock cambió mientras editabas. Actualizá la lista antes de guardar otra vez.",
  STOCK_BELOW_RESERVED: "No podés dejar menos unidades que las reservadas por compradores.",
  UNIQUE_PIECE_LIMIT: "Una pieza única admite como máximo una unidad.",
  MADE_TO_ORDER_NOT_SELLABLE: "Los productos por encargo no admiten venta inmediata.",
  INVALID_STOCK_EDIT: "Revisá la cantidad y escribí un motivo de al menos tres caracteres.",
};
type History = { at: string; actor: string; reason: string; before: { stockOnHand: number }; after: { stockOnHand: number } };
export function InventoryClient() {
  const [rows, setRows] = useState<InventoryRow[]>([]), [query, setQuery] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const r = await fetch("/api/admin/inventory", { cache: "no-store" }); if (!r.ok) throw new Error(); setRows((await r.json()).products); }
    catch { setError("No pudimos cargar el inventario. Verificá tu sesión y volvé a intentar."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/inventory", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); const data = await response.json(); setRows(data.products); })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar el inventario. Verificá tu sesión."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  return <main className={styles.main}>
    <div className={styles.heading}><div><h1>Inventario</h1><p>Registrá las unidades físicas del taller. Las reservas se descuentan de la disponibilidad.</p></div><button onClick={load} disabled={loading}>Actualizar lista</button></div>
    <label className={styles.search}>Buscar producto<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre de la pieza" /></label>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Cargando inventario…</p> : <div className={styles.grid}>
      {rows.filter(r => r.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(row => <StockCard key={`${row.id}-${row.version}-${row.stockOnHand}-${row.reserved}`} row={row} onSaved={saved => { setRows(current => current.map(r => r.id === row.id ? { ...r, ...saved } : r)); setNotice(`Stock guardado: ${row.name}.`); }} />)}
      {!rows.length && <p>Publicá los productos en Sanity para comenzar.</p>}
    </div>}
  </main>;
}
function StockCard({ row, onSaved }: { row: InventoryRow; onSaved: (row: InventoryRow) => void }) {
  const [quantity, setQuantity] = useState(String(row.stockOnHand)), [enabled, setEnabled] = useState(row.enabled), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [history, setHistory] = useState<History[] | null>(null);
  const [mutationId, setMutationId] = useState<string | null>(null);
  const dirty = () => setMutationId(null);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage("");
    const id = mutationId ?? crypto.randomUUID(); setMutationId(id);
    try {
      const r = await fetch("/api/admin/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: row.id, mutationId: id, expectedVersion: row.version, expectedStock: row.stockOnHand, expectedReserved: row.reserved, stockOnHand: Number(quantity), enabled, reason }) });
      const body = await r.json();
      if (!r.ok) { setMessage(messages[body.code] ?? "No se pudo guardar. Actualizá la lista para revisar el estado."); return; }
      onSaved({ ...row, ...body }); setMessage("Stock guardado."); setReason(""); setMutationId(null);
    } catch { setMessage("No llegó la respuesta. Podés reintentar este mismo ajuste sin duplicarlo."); }
    finally { setBusy(false); }
  }
  async function showHistory() {
    try { const r = await fetch(`/api/admin/inventory?productId=${encodeURIComponent(row.id)}`, { cache: "no-store" }); if (!r.ok) throw new Error(); setHistory((await r.json()).history); }
    catch { setMessage("No pudimos consultar el historial."); }
  }
  return <article className={styles.card}><h2>{row.name}</h2><p>{row.tone === "unica" ? "Pieza única" : row.tone === "encargo" ? "Por encargo" : "Venta por unidades"}</p>
    <dl className={styles.counts}><div><dt>Existencias</dt><dd>{row.stockOnHand}</dd></div><div><dt>Reservadas</dt><dd>{row.reserved}</dd></div><div><dt>Disponibles</dt><dd>{row.enabled && row.tone !== "encargo" ? row.stockOnHand - row.reserved : 0}</dd></div></dl>
    <form onSubmit={save}><fieldset disabled={busy}><label>Unidades físicas<input type="number" min={row.reserved} max={row.tone === "unica" ? 1 : 1000000} step="1" required value={quantity} onChange={e => { setQuantity(e.target.value); dirty(); }} /></label>
      <label className={styles.check}><input type="checkbox" checked={enabled} disabled={row.tone === "encargo"} onChange={e => { setEnabled(e.target.checked); dirty(); }} />Habilitar venta</label>
      <label>Motivo del ajuste<input required minLength={3} maxLength={300} value={reason} placeholder="Carga inicial, reposición, rotura…" onChange={e => { setReason(e.target.value); dirty(); }} /></label>
      <button type="submit">{busy ? "Guardando…" : "Guardar stock"}</button></fieldset></form>
    {message && <p role="status">{message}</p>}<button className={styles.historyButton} type="button" onClick={showHistory}>Ver últimos ajustes</button>
    {history && <ul>{history.length ? history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false })} · {h.before.stockOnHand} → {h.after.stockOnHand} · {h.reason} · {h.actor}</li>) : <li>Sin ajustes manuales registrados.</li>}</ul>}
  </article>;
}
