"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package, Search, SlidersHorizontal } from "lucide-react";

import type { AdminOrder, AdminOrderPage, OrderSort } from "../domain/order";
import { destinationLabel, formatDate, formatMoney, maskEmail } from "./order-format";
import styles from "./admin.module.css";

export function OrdersClient({
  demo,
  initialQuery,
  initialSort,
}: {
  demo: boolean;
  initialQuery: string;
  initialSort: OrderSort;
}) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<OrderSort>(initialSort);
  const [cursor, setCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<string | null>>([]);
  const [page, setPage] = useState<AdminOrderPage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const requestKey = JSON.stringify([demo, query, sort, cursor]);
  const loading = loadedKey !== requestKey && errorKey !== requestKey;
  const error = errorKey === requestKey;
  const visiblePage = loadedKey === requestKey ? page : null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setCursor(null);
      setHistory([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    if (sort !== "created_desc") url.searchParams.set("sort", sort);
    else url.searchParams.delete("sort");
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [query, sort]);

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("/api/admin/orders", window.location.origin);
    if (demo) url.searchParams.set("demo", "1");
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("sort", sort);
    if (cursor) url.searchParams.set("cursor", cursor);
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load orders");
        return response.json() as Promise<AdminOrderPage>;
      })
      .then((result) => {
        setPage(result);
        setLoadedKey(requestKey);
        setErrorKey(null);
        setSelectedId((current) => result.orders.some((order) => order.id === current)
          ? current : result.orders[0]?.id ?? null);
      })
      .catch((caught) => {
        if ((caught as Error).name !== "AbortError") setErrorKey(requestKey);
      });
    return () => controller.abort();
  }, [demo, query, sort, cursor, requestKey]);

  const selected = visiblePage?.orders.find((order) => order.id === selectedId) ?? null;
  const detailHref = (order: AdminOrder) => {
    const params = new URLSearchParams();
    if (demo) params.set("demo", "1");
    if (query) params.set("q", query);
    if (sort !== "created_desc") params.set("sort", sort);
    return `/admin/pedidos/${order.id}${params.size ? `?${params}` : ""}`;
  };

  return (
    <main className={styles.main}>
      <div className={styles.pageIntro}>
        <div>
          <h1>Pedidos</h1>
          <p>Encontrá lo que necesita atención y abrí cada pedido para revisar sus datos.</p>
        </div>
        <span className={styles.readOnly}>Consulta de pedidos</span>
      </div>
      {demo && <div className={styles.demoNotice}>Estos pedidos son ejemplos del backend para revisar la interfaz. Ninguno corresponde a una venta real.</div>}

      <div className={styles.workspace}>
        <section className={styles.listPanel} aria-label="Bandeja de pedidos">
          <div className={styles.panelTop}>
            <div className={styles.searchWrap}>
              <Search size={18} aria-hidden="true" />
              <label className={styles.srOnly} htmlFor="order-search">Buscar pedidos</label>
              <input
                id="order-search"
                type="search"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Buscar ID, comprador o producto"
                maxLength={128}
              />
            </div>
            <label className={styles.sortWrap}>
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span className={styles.srOnly}>Orden de pedidos</span>
              <select value={sort} onChange={(event) => {
                setSort(event.target.value as OrderSort);
                setCursor(null);
                setHistory([]);
              }}>
                <option value="created_desc">Más nuevos</option>
                <option value="created_asc">Más antiguos</option>
              </select>
            </label>
          </div>

          <div className={styles.listHeading}>
            <span>Pedido y comprador</span>
            <span>Estado</span>
            <span>Total</span>
          </div>
          <div aria-live="polite" className={styles.srOnly}>
            {loading ? "Cargando pedidos" : `${visiblePage?.orders.length ?? 0} pedidos en esta página`}
          </div>
          {loading ? (
            <div className={styles.empty}>Cargando pedidos…</div>
          ) : error ? (
            <div className={styles.empty}><strong>No pudimos cargar los pedidos.</strong><span>Volvé a intentar en unos segundos.</span></div>
          ) : !visiblePage?.orders.length ? (
            <div className={styles.empty}>
              <Package size={28} aria-hidden="true" />
              <strong>{query ? "No encontramos coincidencias" : "Todavía no hay pedidos"}</strong>
              <span>{query ? "Probá con otro ID, email o nombre de producto." : "Los nuevos pedidos aparecerán aquí."}</span>
            </div>
          ) : (
            <div className={styles.rows}>
              {visiblePage.orders.map((order) => {
                const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <button
                    key={order.id}
                    type="button"
                    className={`${styles.orderRow} ${selectedId === order.id ? styles.selectedRow : ""}`}
                    onClick={() => setSelectedId(order.id)}
                    aria-pressed={selectedId === order.id}
                  >
                    <span className={styles.rowMain}>
                      <span className={styles.productIcon}><Package size={21} aria-hidden="true" /></span>
                      <span className={styles.rowText}>
                        <span className={styles.orderReference}>{order.reference} <span>· {formatDate(order.createdAt)}</span></span>
                        <strong>{order.buyer.name ?? order.buyer.email ?? "Comprador sin identificar"}</strong>
                        <span className={styles.productLine}>{order.items[0]?.name ?? "Sin productos"}{order.items.length > 1 ? ` +${order.items.length - 1}` : ""} · {count} {count === 1 ? "pieza" : "piezas"}</span>
                        <span className={styles.mobileDestination}>{destinationLabel(order)}</span>
                      </span>
                    </span>
                    <span className={styles.rowStatus}><StatusBadge order={order} /><small>{destinationLabel(order)}</small></span>
                    <strong className={styles.rowTotal}>{formatMoney(order.totalCents, order.currency)}</strong>
                  </button>
                );
              })}
            </div>
          )}
          <div className={styles.pagination}>
            <span>Página {history.length + 1}</span>
            <div>
              <button type="button" disabled={loading || history.length === 0} onClick={() => {
                setCursor(history[history.length - 1]);
                setHistory(history.slice(0, -1));
              }}><ChevronLeft size={17} /> Anterior</button>
              <button type="button" disabled={loading || !visiblePage?.nextCursor} onClick={() => {
                setHistory([...history, cursor]);
                setCursor(visiblePage?.nextCursor ?? null);
              }}>Siguiente <ChevronRight size={17} /></button>
            </div>
          </div>
        </section>

        <aside className={styles.previewPanel} aria-label="Vista previa del pedido">
          {selected ? (
            <>
              <div className={styles.previewHeader}>
                <span>Vista previa</span>
                <strong>{selected.reference}</strong>
                <small>{formatDate(selected.createdAt, true)}</small>
              </div>
              <div className={styles.previewBody}>
                <StatusBadge order={selected} />
                <div className={styles.previewTotal}><span>Total del pedido</span><strong>{formatMoney(selected.totalCents, selected.currency)}</strong></div>
                <div className={styles.infoBlock}><span>Comprador</span><strong>{selected.buyer.name ?? "Nombre aún no disponible"}</strong><small>{maskEmail(selected.buyer.email)}</small></div>
                <div className={styles.infoBlock}><span>Entrega</span><strong>{selected.deliveryMethod ?? "Modalidad aún no disponible"}</strong><small>{destinationLabel(selected)}</small></div>
                <div className={styles.infoBlock}><span>Productos</span>{selected.items.map((item) => <strong key={item.productId}>{item.quantity} × {item.name}</strong>)}</div>
                <div className={styles.nextAction}><span>Siguiente paso</span><p>{selected.nextAction}</p></div>
                <Link className={styles.primaryLink} href={detailHref(selected)}>Ver pedido <ChevronRight size={18} /></Link>
              </div>
            </>
          ) : <div className={styles.previewEmpty}>Seleccioná un pedido para ver su resumen.</div>}
        </aside>
      </div>
    </main>
  );
}

export function StatusBadge({ order }: { order: AdminOrder }) {
  const tone = order.status === "attention" ? styles.statusAttention
    : order.status === "cancelled" ? styles.statusMuted
      : order.status === "prepare" || order.status === "ready_to_ship" ? styles.statusActive
        : styles.statusNeutral;
  return <span className={`${styles.statusBadge} ${tone}`}>{order.statusLabel}</span>;
}
