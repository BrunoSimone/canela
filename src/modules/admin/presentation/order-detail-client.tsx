"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, Truck } from "lucide-react";

import type { AdminOrder } from "../domain/order";
import { destinationLabel, formatDate, formatMoney } from "./order-format";
import { StatusBadge } from "./orders-client";
import { PreparationEditor } from "./preparation-editor";
import { OrderOperations } from "./order-operations";
import { ShipmentActions } from "./shipment-actions";
import { ReviewNotice } from "./review-notice";
import styles from "./admin.module.css";

export function OrderDetailClient({ id, demo, backHref }: { id: string; demo: boolean; backHref: string }) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const url = `/api/admin/orders/${encodeURIComponent(id)}${demo ? "?demo=1" : ""}`;
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Order unavailable");
        return response.json() as Promise<AdminOrder>;
      })
      .then((result) => { if (!controller.signal.aborted) setOrder(result); })
      .catch((caught) => { if ((caught as Error).name !== "AbortError") setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, demo, retry]);

  if (loading) return <main className={styles.detailMain}><p>Cargando pedido…</p></main>;
  if (error || !order) return <main className={styles.detailMain}><Link href={backHref} className={styles.backLink}><ArrowLeft size={18} /> Volver a pedidos</Link><div className={styles.empty} role="alert"><strong>No pudimos abrir este pedido.</strong><button type="button" className={styles.primaryLink} onClick={() => { setError(false); setLoading(true); setRetry(value => value + 1); }}>Reintentar</button><Link href="/admin/ingresar" className={styles.textButton}>Volver a ingresar si tu sesión terminó</Link></div></main>;

  return (
    <main className={styles.detailMain}>
      <Link href={backHref} className={styles.backLink}><ArrowLeft size={18} /> Volver a pedidos</Link>
      {demo && <div className={styles.demoNotice}>Pedido de demostración. Los datos de esta ficha son ficticios.</div>}
      <div className={styles.detailIntro}>
        <div><span className={styles.detailKicker}>Ficha de pedido</span><h1>{order.reference}</h1><p>Creado el {formatDate(order.createdAt, true)}</p></div>
        <div className={styles.detailIntroRight}><StatusBadge order={order} /><strong>{formatMoney(order.totalCents, order.currency)}</strong></div>
      </div>
      {(order.status === "attention" || order.notifications?.some(notice => notice.state === "review")) &&
        <div className={styles.detailReview}>
          <ReviewNotice>
            {order.status === "attention" && <p>{order.nextAction}</p>}
            {order.notifications?.some(notice => notice.state === "review") && <>
              <p>Hay correos que necesitan intervención. Revisá los avisos de este pedido y pedí ayuda técnica.</p>
              <a href="#despacho-y-avisos" className={styles.textButton}>Revisar avisos</a>
            </>}
          </ReviewNotice>
        </div>}
      <div className={styles.detailGrid}>
        <div className={styles.detailColumn}>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}><Package size={21} /><h2>Productos</h2></div>
            <div className={styles.itemList}>
              {order.items.map((item) => <div className={styles.item} key={item.productId}>
                <span className={styles.productIcon}><Package size={22} /></span>
                <span><strong>{item.name}</strong><small>{item.quantity} {item.quantity === 1 ? "pieza" : "piezas"} · {formatMoney(item.unitPriceCents, order.currency)} por pieza</small></span>
                <strong>{formatMoney(item.unitPriceCents * item.quantity, order.currency)}</strong>
              </div>)}
            </div>
            <dl className={styles.totals}>
              <div><dt>Productos</dt><dd>{formatMoney(order.subtotalCents, order.currency)}</dd></div>
              <div><dt>Envío</dt><dd>{formatMoney(order.shippingCents, order.currency)}</dd></div>
              <div><dt>Total del pedido</dt><dd>{formatMoney(order.totalCents, order.currency)}</dd></div>
            </dl>
          </section>
          <section className={styles.detailCard}>
            <div className={styles.cardHeading}><Truck size={21} /><h2>Entrega</h2></div>
            <dl className={styles.detailFacts}>
              <div><dt>Modalidad</dt><dd>{order.deliveryMethod ?? "Aún no disponible"}</dd></div>
              <div><dt>Destino</dt><dd>{destinationLabel(order)}</dd></div>
              <div><dt>Código postal</dt><dd>{order.destination?.postalCode ?? "Aún no disponible"}</dd></div>
              <div><dt>Recibe</dt><dd>{order.recipientName ?? order.buyer.name ?? "Aún no disponible"}</dd></div>
              <div><dt>Dirección</dt><dd className={!order.shippingAddress ? styles.pending : undefined}>{order.shippingAddress ?? "Aún no disponible"}</dd></div>
              <div><dt>Seguimiento</dt><dd>{order.trackingNumber ?? (order.shipment?.trackingUrl ? "Disponible en el transporte" : "Aún no disponible")}{order.shipment?.trackingUrl && <><br /><a className={styles.textButton} href={order.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Consultar seguimiento</a></>}</dd></div>
            </dl>
            {!demo && !order.shipment?.trackingUrl && !order.trackingNumber && <p className={styles.integrationNote}>El seguimiento aparecerá cuando el transporte lo informe.</p>}
          </section>
        </div>
        <div className={styles.detailColumn}>
          {order.status !== "attention" && <section className={styles.detailCard}>
            <h2>Próximo paso</h2>
            <div className={styles.actionBox}><StatusBadge order={order} /><p>{order.nextAction}</p></div>
          </section>}
          {order.packingPlan?.map((parcel, i) => <section className={styles.detailCard} key={i}>
            <h2>Caja y acomodo cotizados</h2>
            <p>{parcel.packing?.boxName ?? "Embalaje del pedido"} · {parcel.widthCm} × {parcel.lengthCm} × {parcel.heightCm} cm · {parcel.weightGrams} g totales.</p>
            {parcel.packing && <><p>Las posiciones indican distancia desde una esquina interior: ancho (X), largo (Y) y altura (Z), en cm. Conservá las protecciones individuales.</p><ul>
              {parcel.packing.placements.map(p => <li key={`${p.productId}-${p.unit}`}>{order.items.find(i => i.productId === p.productId)?.name ?? "Pieza"}, unidad {p.unit}: X {p.x}, Y {p.y}, Z {p.z} · ocupa {p.widthCm} × {p.lengthCm} × {p.heightCm} cm.</li>)}
            </ul></>}
            <p>Comprobá el paquete armado y registrá abajo su peso y medidas reales antes de solicitar la etiqueta.</p>
          </section>)}
          <PreparationEditor order={order} demo={demo} onSaved={(preparation) => setOrder((current) => current ? {
            ...current,
            preparation,
            status: "ready_to_ship",
            statusLabel: "Listo para crear envío",
            nextAction: "Confirmar el embalaje para generar la etiqueta.",
          } : current)} />
          <ShipmentActions key={order.preparation?.version ?? 0} order={order} onChanged={setOrder} />
          <OrderOperations order={order} onChanged={setOrder} />
          <section className={styles.detailCard}>
            <h2>Comprador</h2>
            <dl className={styles.detailFacts}>
              <div><dt>Nombre</dt><dd>{order.buyer.name ?? "Aún no disponible"}</dd></div>
              <div><dt>Email</dt><dd>{order.buyer.email ?? "Aún no disponible"}</dd></div>
              <div><dt>Teléfono</dt><dd>{order.buyer.phone ?? "Aún no disponible"}</dd></div>
            </dl>
          </section>
          <section className={styles.detailCard}>
            <h2>Datos del pedido</h2>
            <dl className={styles.detailFacts}>
              <div><dt>ID interno</dt><dd className={styles.idValue}>{order.id}</dd></div>
              <div><dt>Última actualización</dt><dd>{formatDate(order.updatedAt, true)}</dd></div>
              <div><dt>Origen de datos</dt><dd>{order.source === "demo" ? "Demostración" : "Base de datos de Canela"}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </main>
  );
}
