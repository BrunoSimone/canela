import type { PlannedParcel } from "../../shipping/domain/parcel-plan";
import styles from "./admin.module.css";

export function PackingPlan({ parcel, items }: { parcel: PlannedParcel; items: { productId: string; name: string }[] }) {
  const margin = parcel.quoteMargin, physical = margin?.base ?? parcel;
  const withoutMargin = margin?.status === "price_changed" ? "El margen cambiaba la tarifa de este servicio." :
    margin?.status === "limits" ? "El margen superaba un límite de la caja o del envío." : "No se pudo confirmar la tarifa con margen.";
  return <section className={styles.detailCard}>
    <h2>Caja y acomodo cotizados</h2>
    <p>{parcel.packing?.boxName ?? "Embalaje del pedido"} · estimación: {physical.widthCm} × {physical.lengthCm} × {physical.heightCm} cm · {physical.weightGrams} g totales.</p>
    {margin && (margin.status === "applied" ? <p className={styles.integrationNote}>
      <strong>Cotización con margen de embalaje.</strong> El envío cobrado se calculó con {parcel.widthCm} × {parcel.lengthCm} × {parcel.heightCm} cm · {parcel.weightGrams} g. La caja elegida y el acomodo siguen siendo los indicados arriba.
    </p> : <p className={styles.integrationNote}>
      <strong>Cotización sin margen adicional.</strong> Este pedido usó la política anterior. {withoutMargin} Se conservó el precio de la estimación original.
    </p>)}
    {parcel.packing && <><p>Las posiciones indican distancia desde una esquina interior: ancho (X), largo (Y) y altura (Z), en cm. Conservá las protecciones individuales.</p><ul>
      {parcel.packing.placements.map(p => <li key={`${p.productId}-${p.unit}`}>{items.find(i => i.productId === p.productId)?.name ?? "Pieza"}, unidad {p.unit}: X {p.x}, Y {p.y}, Z {p.z} · ocupa {p.widthCm} × {p.lengthCm} × {p.heightCm} cm.</li>)}
    </ul></>}
    <p>Comprobá el paquete armado y registrá abajo su peso y medidas reales antes de solicitar la etiqueta. El costo final se vuelve a consultar con esos datos.</p>
  </section>;
}
