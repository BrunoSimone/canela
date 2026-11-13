"use client";
import { useEffect, useRef, useState } from "react";
import type { Stock } from "@/modules/inventory/domain/stock-edit";
import styles from "./catalog-panel.module.css";
export type StockHistory = {
  at: string;
  actor: string;
  reason: string;
  before: Stock;
  after: Stock;
};
export function StockSection({
  id,
  initial,
  history: initialHistory = [],
  onDirty,
}: {
  id: string;
  initial: Stock;
  history?: StockHistory[];
  onDirty?: (dirty: boolean) => void;
}) {
  const [stock, setStock] = useState(initial),
    [quantity, setQuantity] = useState(String(initial.stockOnHand)),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [history, setHistory] = useState(initialHistory);
  const mutation = useRef<string | null>(null),
    pending = useRef(false);
  useEffect(() => {
    onDirty?.(quantity !== String(stock.stockOnHand) || reason !== "");
  }, [quantity, stock.stockOnHand, reason, onDirty]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const mutationId = (mutation.current ??= crypto.randomUUID());
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stock",
          id,
          stock: {
            mutationId,
            expectedVersion: stock.version,
            expectedStock: stock.stockOnHand,
            expectedReserved: stock.reserved,
            stockOnHand: Number(quantity),
            enabled: true,
            reason,
          },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setHistory((h) =>
        [
          {
            at: new Date().toISOString(),
            actor: "Desde esta ficha",
            reason,
            before: stock,
            after: data.stock,
          },
          ...h,
        ].slice(0, 20),
      );
      setStock(data.stock);
      setQuantity(String(data.stock.stockOnHand));
      setReason("");
      mutation.current = null;
      setMessage("Stock actualizado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el stock.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className={styles.section}>
      <h2>Stock</h2>
      <p>
        Contá las unidades que aún no vendiste. Incluí las reservadas; los
        pedidos ya pagados se descuentan automáticamente.
      </p>
      <dl className={styles.counts}>
        <div>
          <dt>Sin vender</dt>
          <dd>{stock.stockOnHand}</dd>
        </div>
        <div>
          <dt>Reservadas</dt>
          <dd>{stock.reserved}</dd>
        </div>
        <div>
          <dt>Disponibles</dt>
          <dd>{stock.stockOnHand - stock.reserved}</dd>
        </div>
      </dl>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className={styles.grid}>
            <label>
              Unidades sin vender
              <input
                type="number"
                min={stock.reserved}
                max={1000000}
                step="1"
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  mutation.current = null;
                }}
              />
            </label>
            <label>
              Motivo del ajuste
              <input
                required
                minLength={3}
                maxLength={300}
                placeholder="Carga inicial, reposición…"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  mutation.current = null;
                }}
              />
            </label>
          </div>
          <button
            style={{ marginTop: 18 }}
            disabled={busy || !reason.trim() || quantity === ""}
            type="submit"
          >
            {busy ? "Guardando…" : "Actualizar stock"}
          </button>
        </fieldset>
      </form>
      <p className={styles.meta}>
        Con cero unidades disponibles la pieza aparece agotada. Para retirarla
        del catálogo, despublicá su ficha.
      </p>
      <details>
        <summary>Últimos ajustes de stock</summary>
        {history.length ? (
          <ul className={styles.history}>
            {history.map((h, i) => (
              <li key={i}>
                {new Date(h.at).toLocaleString("es-AR")} ·{" "}
                {h.before.stockOnHand} → {h.after.stockOnHand} unidades ·{" "}
                {h.reason} · {h.actor}
              </li>
            ))}
          </ul>
        ) : (
          <p>Todavía no hay ajustes manuales.</p>
        )}
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className={styles.message}>
          {message}
        </p>
      )}
    </section>
  );
}
