"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { cm, dimensions, type MosaicDesign } from "../domain/design";
import { formatArs, type FrameEstimate } from "../domain/estimate";
import { MosaicSvg } from "./mosaic-svg";
import { DemoNotice } from "./gallery";
import styles from "./customization.module.css";

export function FrameReview({ design, estimate, onEdit }: { design: MosaicDesign; estimate: FrameEstimate; onEdit: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const side = cm(dimensions(design.config, design.size).framedMm);
  return <div className={styles.page}>
    <button className={styles.backLink} onClick={onEdit}><ArrowLeft size={16} aria-hidden="true" /> Seguir editando</button>
    <div className={styles.pageHeading}><div><h1 ref={heading} tabIndex={-1}>Revisá tu cuadro</h1><p>Tu diseño y una primera idea de su precio, en un solo lugar.</p></div></div>
    <DemoNotice />
    <div className={styles.reviewLayout}>
      <div className={styles.previewWall}><MosaicSvg design={design} label={`Tu mosaico de ${design.size} por ${design.size} venecitas`} className={styles.previewArt} /><span className={styles.previewCaption}>Vista orientativa · Los colores reales pueden variar</span></div>
      <section className={styles.reviewDetails} aria-label="Resumen del cuadro">
        <h2>Un cuadro hecho para vos</h2>
        <p>{side} × {side} cm con marco · Medidas de prueba</p>
        <dl className={styles.priceBreakdown}>
          <div><dt>Venecitas estimadas</dt><dd>{formatArs(estimate.tilesCents)}</dd></div>
          <div><dt>Mano de obra estimada</dt><dd>{formatArs(estimate.laborCents)}</dd></div>
          <div><dt>Base, marco e insumos estimados</dt><dd>{formatArs(estimate.suppliesCents)}</dd></div>
          {estimate.roundingCents > 0 && <div><dt>Redondeo de la estimación</dt><dd>{formatArs(estimate.roundingCents)}</dd></div>}
        </dl>
        <p className={styles.estimateLabel}>Estimación de prueba · ARS</p>
        <p className={styles.estimateAmount} aria-label="Precio estimado del cuadro">{formatArs(estimate.totalCents)}</p>
        <p className={styles.shippingPending}>Envío a cotizar</p>
        <p className={styles.hint}>El precio final se confirmará con los materiales y las tarifas del taller.</p>
        <div className={styles.nextSteps}><h3>Antes de comprar</h3><p>Los cuadros personalizados se compran por separado, con su propio envío y plazo de fabricación.</p><p>La fabricación lleva aproximadamente una semana, a confirmar según disponibilidad. El plazo de transporte se suma después.</p><p>La compra estará disponible cuando estén confirmados el precio, los materiales y el envío.</p></div>
        <p className={styles.reviewNotice} role="status">No se creó un pedido ni se reservó un turno. Este resumen es de prueba y se pierde al salir o recargar.</p>
      </section>
    </div>
  </div>;
}
