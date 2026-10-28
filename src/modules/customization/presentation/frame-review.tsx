"use client";
import type { PublicFrameEstimate } from "../domain/public-pricing";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cm, dimensions, type MosaicDesign } from "../domain/design";
import { formatArs } from "../domain/estimate";
import { MosaicSvg } from "./mosaic-svg";
import styles from "./customization.module.css";

export function FrameReview({ design, estimate, onEdit, onContinue, productionDays = 7, mode = 'sandbox' }: { design: MosaicDesign; estimate: PublicFrameEstimate; onEdit: () => void; onContinue?: () => void; productionDays?: number; mode?:'sandbox'|'production' }) {
  const [accepted, setAccepted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const side = cm(dimensions(design.config, design.size).framedMm);
  return <div className={styles.page}>
    <button className={styles.backLink} onClick={onEdit}><ArrowLeft size={16} aria-hidden="true" /> Seguir editando</button>
    <div className={styles.pageHeading}><div><h1 ref={heading} tabIndex={-1}>Revisá tu cuadro</h1><p>Mirá cómo quedó y revisá el tamaño y el precio. Todavía podés volver a editarlo.</p></div></div>
    <div className={styles.reviewLayout}>
      <div className={styles.previewWall}><MosaicSvg design={design} label={`Tu mosaico de ${design.size} por ${design.size} venecitas`} className={styles.previewArt} /><span className={styles.previewCaption}>Los colores y el acabado pueden variar en el cuadro real</span></div>
      <section className={styles.reviewDetails} aria-label="Resumen del cuadro">
        <h2>Cuadro personalizado</h2>
        <p>{side} × {side} cm con marco{mode==='sandbox'?' · Medidas orientativas':''}</p>
        <p className={`${styles.estimateLabel} ${styles.reviewPriceLabel}`}>{mode==='sandbox'?'Precio estimado del cuadro con marco':'Precio del cuadro con marco'} · ARS</p>
        <p className={styles.estimateAmount} aria-label={mode==='sandbox'?'Precio estimado del cuadro':'Precio del cuadro'}>{formatArs(estimate.totalCents)}</p>
        <p className={styles.shippingPending}>Envío a cotizar</p>
        {mode==='sandbox'&&<p className={styles.hint}>El precio es orientativo y se confirma antes de comprar.</p>}
        <div className={styles.nextSteps}><h3>Antes de comprar</h3><p>Tu cuadro se hace a pedido y se compra por separado de las piezas del catálogo.</p><p>Hacerlo lleva alrededor de {productionDays} días, según los pedidos que haya en el taller. Después se suma el tiempo de envío.</p>{mode==='sandbox'&&<p>Por ahora podés probar los pasos de compra sin pagar ni encargar el cuadro.</p>}</div>
        {onContinue && <div className={styles.purchaseConsent}><label><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Revisé el diseño y quiero continuar con esta versión.</label><button className={styles.primaryButton} disabled={!accepted} onClick={onContinue}>Continuar con el envío</button>{mode==='sandbox'&&<p className={styles.hint}>Podés seguir probando. No se cobra dinero.</p>}</div>}
        <p className={styles.reviewNotice} role="status">Este resumen no encarga el cuadro ni reserva un lugar en el taller. Si salís o recargás la página, vas a perder el diseño.</p>
      </section>
    </div>
  </div>;
}
