"use client";

import { useState, type FormEvent } from "react";

import type { AdminOrder } from "../domain/order";
import { InvalidPreparationError, parseSavePreparationInput, type OrderPreparation } from "../domain/preparation";
import styles from "./admin.module.css";

type DraftParcel = { weightGrams: string; heightCm: string; widthCm: string; lengthCm: string };
const emptyParcel = (): DraftParcel => ({ weightGrams: "", heightCm: "", widthCm: "", lengthCm: "" });

export function PreparationEditor({ order, demo, onSaved }: {
  order: AdminOrder;
  demo: boolean;
  onSaved: (preparation: OrderPreparation) => void;
}) {
  const [parcels, setParcels] = useState<DraftParcel[]>(() =>
    order.preparation?.parcels.map((parcel) => ({
      weightGrams: String(parcel.weightGrams),
      heightCm: String(parcel.heightCm),
      widthCm: String(parcel.widthCm),
      lengthCm: String(parcel.lengthCm),
    })) ?? [emptyParcel()],
  );
  const [note, setNote] = useState(order.preparation?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(order.preparation?.version ?? 0);
  const editable = !demo && !order.shipment && (order.status === "prepare" || order.status === "ready_to_ship");
  const maxParcels = order.packingPlan ? 1 : 20;

  function updateParcel(index: number, field: keyof DraftParcel, value: string) {
    setParcels((current) => current.map((parcel, position) =>
      position === index ? { ...parcel, [field]: value } : parcel));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable || saving) return;
    setMessage(null);
    let input;
    try {
      input = parseSavePreparationInput({
        expectedVersion: version,
        parcels: parcels.map((parcel) => ({
          weightGrams: Number(parcel.weightGrams),
          heightCm: Number(parcel.heightCm),
          widthCm: Number(parcel.widthCm),
          lengthCm: Number(parcel.lengthCm),
        })),
        note,
      });
    } catch (error) {
      if (error instanceof InvalidPreparationError) {
        setMessage("Revisá el peso y las medidas de cada bulto.");
        return;
      }
      throw error;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}/preparation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      if (!response.ok) {
        const failure = await response.json() as { code?: string };
        if (failure.code === "PREPARATION_CONFLICT") {
          setMessage("Otra sesión actualizó la preparación. Recargá el pedido antes de guardar.");
        } else if (failure.code === "PREPARATION_NOT_ALLOWED") {
          setMessage("El estado del pago cambió. Recargá el pedido antes de continuar.");
        } else {
          setMessage("No pudimos guardar la preparación. Intentá nuevamente.");
        }
        return;
      }
      const saved = await response.json() as OrderPreparation;
      setVersion(saved.version);
      onSaved(saved);
      setMessage("Preparación guardada.");
    } catch {
      setMessage("No pudimos guardar la preparación. Intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  return <section className={styles.detailCard}>
    <h2>Preparación del envío</h2>
    <p className={styles.integrationNote}>Anotá el peso y las medidas exteriores reales del paquete listo para despachar. Después podrás confirmar el embalaje y generar la etiqueta.</p>
    {demo && <p className={styles.integrationNote}>Vista de demostración: no se guardan cambios.</p>}
    {!editable && !demo && <p className={styles.integrationNote}>{order.shipment ? "El embalaje está confirmado para este envío y ya no se puede editar." : "La preparación se habilita cuando el pago está confirmado."}</p>}
    <form onSubmit={save} className={styles.preparationForm}>
      {parcels.map((parcel, index) => <fieldset key={index} className={styles.parcelCard} disabled={!editable || saving}>
        <legend>Bulto {index + 1}</legend>
        <div className={styles.parcelFields}>
          {([
            ["weightGrams", "Peso (g)"],
            ["heightCm", "Alto (cm)"],
            ["widthCm", "Ancho (cm)"],
            ["lengthCm", "Largo (cm)"],
          ] as const).map(([field, label]) => <label key={field}>{label}
            <input type="number" inputMode="numeric" min="1" max={field === "weightGrams" ? "100000" : "200"} required value={parcel[field]} onChange={(event) => updateParcel(index, field, event.target.value)} />
          </label>)}
        </div>
        {editable && parcels.length > 1 && <button type="button" className={styles.textButton} onClick={() => setParcels((current) => current.filter((_, position) => position !== index))}>Quitar bulto</button>}
      </fieldset>)}
      {editable && parcels.length < maxParcels && <button type="button" className={styles.textButton} onClick={() => setParcels((current) => [...current, emptyParcel()])}>+ Agregar bulto</button>}
      <label className={styles.preparationNote}>Nota para el taller (opcional)
        <textarea maxLength={2000} rows={3} value={note} disabled={!editable || saving} onChange={(event) => setNote(event.target.value)} />
      </label>
      {message && <p role="status" className={styles.integrationNote}>{message}</p>}
      {editable && <button className={styles.primaryLink} disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar preparación"}</button>}
      {order.preparation && <p className={styles.integrationNote}>Versión {order.preparation.version} · guardada por {order.preparation.updatedBy}</p>}
    </form>
  </section>;
}
