"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Clock3, CircleAlert } from "lucide-react";
import { ARGENTINE_PROVINCES, parseDeliverySnapshot, provinceName } from "@/modules/checkout/domain/delivery";
import type { MosaicDesign } from "../domain/design";
import { formatArs, type FrameEstimate } from "../domain/estimate";
import { selectDesign, type DemoOrder, type DemoOutcome, type DemoPurchaseRequest, type DemoQuote, type DemoRecipient } from "../domain/purchase";
import { FrameReview } from "./frame-review";
import { MosaicSvg } from "./mosaic-svg";
import styles from "./customization.module.css";

type Step = "review" | "shipping" | "payment" | "result";
type Fields = Record<"name" | "email" | "phone" | "document" | "street" | "number" | "floor" | "apartment" | "city" | "province" | "postalCode", string>;
const emptyFields: Fields = { name: "", email: "", phone: "", document: "", street: "", number: "", floor: "", apartment: "", city: "", province: "", postalCode: "" };
class RequestError extends Error { constructor(message: string, public code: string) { super(message); } }
async function demoRequest<T>(signal: AbortSignal, body?: DemoPurchaseRequest): Promise<T> {
  const response = await fetch("/api/cuadros/prueba", { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new RequestError(data.error ?? "No pudimos completar la prueba.", data.code ?? "UNAVAILABLE");
  if (data.mode !== "demo") throw new Error("Respuesta de prueba inválida");
  return data as T;
}
function sampleFields({ email, delivery: d }: DemoRecipient): Fields {
  return { email, name: d.recipientName, phone: d.phone ?? "", document: d.recipientDocument ?? "", street: d.streetName, number: d.streetNumber, floor: d.floor ?? "", apartment: d.apartment ?? "", city: d.city, province: d.provinceCode, postalCode: d.postalCode };
}

export function FramePurchase({ design, estimate, onEdit }: { design: MosaicDesign; estimate: FrameEstimate; onEdit: () => void }) {
  const [step, setStep] = useState<Step>("review");
  const [fields, setFields] = useState<Fields>({ ...emptyFields });
  const [quote, setQuote] = useState<DemoQuote | null>(null);
  const [order, setOrder] = useState<DemoOrder | null>(null);
  const [outcome, setOutcome] = useState<DemoOutcome>("approved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const attemptId = useRef<string | null>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => () => { pendingRequest.current?.abort(); pendingRequest.current = null; }, []);

  async function perform(work: (signal: AbortSignal) => Promise<void>) {
    if (pendingRequest.current) return;
    const controller = new AbortController(); pendingRequest.current = controller;
    setBusy(true); setError("");
    try { await work(controller.signal); }
    catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof RequestError ? e.message : "No pudimos conectar con la prueba. Intentá de nuevo; tu diseño sigue acá.");
        if (e instanceof RequestError && e.code === "QUOTE_EXPIRED") { setQuote(null); setOrder(null); attemptId.current = null; setStep("shipping"); }
      }
    } finally { if (pendingRequest.current === controller) { pendingRequest.current = null; setBusy(false); } }
  }
  function backToShipping() { setQuote(null); setOrder(null); setError(""); attemptId.current = null; setStep("shipping"); }
  function quoteDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let recipient: DemoRecipient;
    try {
      const delivery = parseDeliverySnapshot({ type: "home", buyerName: fields.name, recipientName: fields.name, phone: fields.phone, recipientDocument: fields.document, streetName: fields.street, streetNumber: fields.number, floor: fields.floor, apartment: fields.apartment, city: fields.city, provinceCode: fields.province, postalCode: fields.postalCode });
      if (!delivery.phone || !delivery.recipientDocument || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new Error();
      recipient = { email: fields.email.trim(), delivery };
    } catch { setError("Revisá el email, teléfono, documento y domicilio antes de continuar."); return; }
    void perform(async signal => {
      const next = await demoRequest<DemoQuote>(signal, { action: "quote", design: selectDesign(design), recipient, accepted: true });
      if (signal.aborted) return;
      setQuote(next); attemptId.current = null; setStep("payment");
    });
  }
  function pay() {
    if (!quote) return;
    void perform(async signal => {
      attemptId.current ??= crypto.randomUUID();
      const next = await demoRequest<DemoOrder>(signal, { action: "pay", quoteId: quote.id, attemptId: attemptId.current, outcome });
      if (signal.aborted) return;
      setOrder(next); setStep("result");
    });
  }
  function resolve(result: "approved" | "rejected") {
    if (!quote || !order) return;
    void perform(async signal => {
      const next = await demoRequest<DemoOrder>(signal, { action: "resolve", quoteId: quote.id, orderId: order.id, outcome: result });
      if (!signal.aborted) setOrder(next);
    });
  }
  if (step === "review") return <FrameReview design={design} estimate={estimate} onEdit={onEdit} onContinue={() => { setError(""); setStep("shipping"); }} />;
  const title = step === "shipping" ? "¿A dónde iría tu cuadro?" : step === "payment" ? "Probá el pago de tu cuadro" : order?.status === "approved" ? "Prueba completada" : order?.status === "pending" ? "Pago de prueba pendiente" : "Pago de prueba rechazado";
  const field = (key: keyof Fields, label: string, options: { optional?: boolean; type?: string; maxLength?: number; pattern?: string; numeric?: boolean } = {}) => <label className={styles.formField} key={key}>{label}{options.optional && <span className={styles.optional}>Opcional</span>}<input name={key} value={fields[key]} onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))} required={!options.optional} type={options.type ?? "text"} maxLength={options.maxLength ?? 100} pattern={options.pattern} inputMode={options.numeric ? "numeric" : undefined} autoComplete="off" /></label>;
  return <div className={styles.page}>
    {step !== "result" && <button className={styles.backLink} disabled={busy} onClick={() => step === "shipping" ? setStep("review") : backToShipping()}><ArrowLeft size={16} aria-hidden="true" />{step === "shipping" ? "Volver al resumen" : "Editar domicilio"}</button>}
    <ol className={styles.purchaseSteps} aria-label="Pasos de compra"><li>1. Diseño</li><li aria-current={step === "shipping" ? "step" : undefined}>2. Envío</li><li aria-current={step === "payment" ? "step" : undefined}>3. Pago de prueba</li><li aria-current={step === "result" ? "step" : undefined}>4. Resultado</li></ol>
    <div className={styles.pageHeading}><div><h1 ref={heading} tabIndex={-1}>{title}</h1><p>Una compra separada para tu cuadro, con su propio envío y tiempo de fabricación.</p></div></div>
    <p className={styles.notice}><span className={styles.noticeDot} />Simulación local · No se cobra dinero, no se generan envíos y no se envían emails. Usá datos ficticios.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.purchaseLayout} data-step={step}>
      <div aria-busy={busy}>
        {step === "shipping" && <form onSubmit={quoteDelivery} className={styles.reviewDetails}>
          <div className={styles.controlHeading}><h2>Datos de entrega</h2><button type="button" className={styles.textButton} disabled={busy} onClick={() => void perform(async signal => { const data = await demoRequest<{ recipient: DemoRecipient }>(signal); if (!signal.aborted) setFields(sampleFields(data.recipient)); })}>Completar con datos ficticios</button></div>
          <p className={styles.hint}>Los datos de esta prueba se descartan automáticamente. No se crea una cuenta.</p>
          <fieldset disabled={busy} className={styles.addressFields}><legend className={styles.srOnly}>Destinatario y domicilio</legend>
            {field("name", "Nombre y apellido")}{field("email", "Email", { type: "email", maxLength: 254 })}
            {field("phone", "Teléfono", { type: "tel", maxLength: 24 })}{field("document", "DNI o documento", { maxLength: 20 })}
            {field("street", "Calle")}{field("number", "Número", { maxLength: 12 })}
            {field("floor", "Piso", { optional: true, maxLength: 3 })}{field("apartment", "Departamento", { optional: true, maxLength: 3 })}
            <label className={styles.formField}>Provincia<select name="province" required value={fields.province} onChange={e => setFields(prev => ({ ...prev, province: e.target.value }))}><option value="">Elegí una provincia</option>{ARGENTINE_PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
            {field("city", "Localidad")}{field("postalCode", "Código postal (4 dígitos)", { pattern: "[1-9][0-9]{3}", maxLength: 4, numeric: true })}
          </fieldset>
          <p className={styles.hint}>En esta prueba la entrega es a domicilio. La tarifa es ilustrativa y no se consulta a ningún transporte.</p>
          <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "Preparando…" : "Cotizar envío de prueba"}</button>
        </form>}
        {step === "payment" && quote && <section className={styles.reviewDetails} aria-label="Pago de prueba">
          <h2>Todo listo para simular</h2>
          <p>La cotización dura 15 minutos. Revisá el total y elegí qué resultado querés probar.</p>
          <fieldset disabled={busy} className={styles.simulationOptions}><legend>Resultado del pago simulado</legend>{([['approved', 'Aprobado', 'El pedido avanzaría a fabricación.'], ['pending', 'Pendiente', 'Espera la confirmación del pago.'], ['rejected', 'Rechazado', 'Permite volver a intentar.']] as const).map(([value, label, detail]) => <label key={value}><input type="radio" name="outcome" value={value} checked={outcome === value} onChange={() => { setOutcome(value); attemptId.current = null; setError(""); }} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</fieldset>
          <button className={styles.primaryButton} disabled={busy} onClick={pay}>{busy ? "Simulando…" : "Simular pago"}</button>
          <p className={styles.hint}>No necesitás una tarjeta ni una cuenta de Mercado Pago. El importe real a cobrar en esta prueba es $0.</p>
        </section>}
        {step === "result" && order && <section className={`${styles.reviewDetails} ${styles.resultPanel}`} aria-label="Resultado de la simulación">
          <div role="status">{order.status === "approved" ? <CheckCircle2 size={40} aria-hidden="true" /> : order.status === "pending" ? <Clock3 size={40} aria-hidden="true" /> : <CircleAlert size={40} aria-hidden="true" />}
            <h2>{order.status === "approved" ? "El recorrido llegó hasta el final" : order.status === "pending" ? "Esperando confirmación" : "Podés volver a intentar"}</h2>
            <p>{order.status === "approved" ? "En una compra real, este diseño quedaría confirmado para fabricación. Esta simulación no crea un pedido en el panel de Mariela ni reserva un turno real." : order.status === "pending" ? "Todavía no se iniciaría la fabricación. Podés simular la confirmación o el rechazo para ver qué sucede después." : "No se inicia la fabricación ni se ocupa capacidad de prueba. El diseño y la cotización siguen disponibles para otro intento."}</p>
          </div>
          <p className={styles.reviewNotice}>Sin cobros ni envíos reales. Tu carrito de productos no cambió.</p>
          <div className={styles.resultActions}>
            {order.status === "pending" && <><button className={styles.primaryButton} disabled={busy} onClick={() => resolve("approved")}>Simular confirmación</button><button className={styles.textButton} disabled={busy} onClick={() => resolve("rejected")}>Simular rechazo</button></>}
            {order.status === "rejected" && <button className={styles.primaryButton} disabled={busy} onClick={() => { attemptId.current = null; setOutcome("approved"); setError(""); setStep("payment"); }}>Volver a intentar</button>}
            {order.status !== "pending" && <button className={styles.textButton} disabled={busy} onClick={onEdit}>Volver a mi diseño</button>}
          </div>
          <p className={styles.hint}>Esta sesión no se guarda al salir o recargar. Los pedidos simulados vencen automáticamente; nunca se envían a producción.</p>
        </section>}
      </div>
      <aside className={styles.purchaseSummary} aria-label="Resumen de esta compra">
        <MosaicSvg design={quote?.design ?? design} label="Diseño para esta compra" className={styles.purchaseArt} />
        <h2>Tu cuadro personalizado</h2>
        <dl className={styles.priceBreakdown}><div><dt>Cuadro con marco</dt><dd>{formatArs(quote?.frame.totalCents ?? estimate.totalCents)}</dd></div><div><dt>Envío de prueba</dt><dd>{quote ? formatArs(quote.shipping.cents) : "Por cotizar"}</dd></div></dl>
        {quote && <><p className={styles.estimateLabel}>Total de prueba · ARS</p><p className={styles.estimateAmount} aria-label="Total de prueba">{formatArs(quote.totalCents)}</p><p className={styles.hint}>{quote.productionDays} días estimados de fabricación + {quote.shipping.transitDays} días de transporte. Plazos ilustrativos.</p><div className={styles.deliverySummary}><h3>Entrega a domicilio</h3><p>{quote.recipient.delivery.recipientName}<br />{quote.recipient.delivery.streetName} {quote.recipient.delivery.streetNumber}{quote.recipient.delivery.floor && ` · Piso ${quote.recipient.delivery.floor}`}{quote.recipient.delivery.apartment && ` · Depto. ${quote.recipient.delivery.apartment}`}<br />{quote.recipient.delivery.city}, {provinceName(quote.recipient.delivery.provinceCode)} · {quote.recipient.delivery.postalCode}</p></div></>}
        <p className={styles.hint}>Diseño, embalaje, importes y plazos de prueba. Pendientes de confirmación del taller.</p>
      </aside>
    </div>
  </div>;
}
