"use client";

import { COLOR_VARIATION_NOTICE } from "../domain/appearance";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Cropper from "react-easy-crop";
import { ArrowLeft, ArrowRight, ImagePlus, RotateCcw, ImageIcon } from "lucide-react";
import type { DesignTemplate } from "../application/catalog";
import { cm, dimensions, materialCounts, renderMosaic, type Crop, type WorkshopConfig } from "../domain/design";
import { loadLocalImage, type LocalImage } from "./local-image";
import { formatArs } from "../domain/estimate";
import { lookupFrameEstimate, type PublicPricing } from "../domain/public-pricing";
import { FrameReview } from "./frame-review";
import { FrameCheckout, type FrameCheckoutSettings } from "./frame-checkout";
import { FramePurchase } from "./frame-purchase";
import { MosaicSvg } from "./mosaic-svg";
import { adaptTemplate, formatOf, type FrameFormat } from "../domain/formats";

import styles from "./customization.module.css";

type Source = { kind: "image"; image: LocalImage } | { kind: "template"; template: DesignTemplate };
export type CreatorFormatOption = {id:FrameFormat;config:WorkshopConfig;pricing:PublicPricing;purchaseSettings?:FrameCheckoutSettings};
type Props = { formats?:CreatorFormatOption[]; config: WorkshopConfig; pricing: PublicPricing; template: DesignTemplate | null; templateUnavailable: boolean; purchaseDemoEnabled?: boolean; purchaseSettings?: FrameCheckoutSettings };

export function Creator({ config:initialConfig, pricing:initialPricing, template, templateUnavailable, purchaseDemoEnabled = false, purchaseSettings:initialSettings,formats }: Props) {
  const options=formats??[{id:formatOf(initialConfig),config:initialConfig,pricing:initialPricing,purchaseSettings:initialSettings}];
  const [selectedFormat,setSelectedFormat]=useState<FrameFormat>(template?formatOf(template.design.config):options[0].id);
  const active=options.find(o=>o.id===selectedFormat)??options[0];
  const {config,pricing,purchaseSettings}=active;
  const [source, setSource] = useState<Source | null>(template ? { kind: "template", template } : null);
  const [size, setSize] = useState(template?.design.size ?? config.minCells);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Crop | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"mosaic" | "source">("mosaic");
  const resources = useRef<{ generation: number; url: string | null }>({ generation: 0, url: null });
  const input = useRef<HTMLInputElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const reviewButton = useRef<HTMLButtonElement>(null);
  const wasReviewing = useRef(false);

  useEffect(() => {
    if (wasReviewing.current && !reviewing) reviewButton.current?.focus();
    wasReviewing.current = reviewing;
  }, [reviewing]);

  useEffect(() => {
    const state = resources.current;
    return () => { state.generation++; if (state.url) URL.revokeObjectURL(state.url); };
  }, []);

  function releaseImage() {
    resources.current.generation++;
    if (resources.current.url) URL.revokeObjectURL(resources.current.url);
    resources.current.url = null;
  }
  function resetControls() { setCrop({ x: 0, y: 0 }); setZoom(1); setArea(undefined); setError(""); setView("mosaic"); }
  function reset() { releaseImage(); setSource(null); setSize(config.minCells); setLoading(false); resetControls(); }
  function selectFile(file?: File) {
    if (file) void loadFile(file);
  }
  async function loadFile(file: File) {
    if (!file) return;
    const generation = ++resources.current.generation;
    setLoading(true); setError("");
    try {
      const image = await loadLocalImage(file);
      if (generation !== resources.current.generation) { URL.revokeObjectURL(image.url); return; }
      if (resources.current.url) URL.revokeObjectURL(resources.current.url);
      resources.current.url = image.url;
      resetControls(); setSource({ kind: "image", image });
    } catch (e) {
      if (generation === resources.current.generation) setError(e instanceof Error ? e.message : "No pudimos abrir esa imagen. Intentá con otra.");
    } finally { if (generation === resources.current.generation) setLoading(false); }
  }

  const result = useMemo(() => {
    if (!source) return null;
    try {
      const base = source.kind === "image" ? renderMosaic(source.image.raster, config, size, area) : adaptTemplate(source.template.design, config, size);
      return { base, design: base, error: "" };
    } catch (e) { return { base: null, design: null, error: e instanceof Error ? e.message : "No pudimos armar el mosaico. Probá con otra imagen." }; }
  }, [source, config, size, area]);
  const design = result?.design??null;
  const measures = dimensions(config, size);
  const counts = design ? materialCounts(design) : [];
  const estimate = lookupFrameEstimate(config, size, pricing);

  if (reviewing && design && purchaseSettings) return <FrameCheckout design={design} estimate={estimate} settings={purchaseSettings} onEdit={() => setReviewing(false)} />;
  if (reviewing && design && purchaseDemoEnabled) return <FramePurchase design={design} estimate={estimate} onEdit={() => setReviewing(false)} />;
  if (reviewing && design) return <FrameReview design={design} estimate={estimate} onEdit={() => setReviewing(false)} />;

  return <div className={styles.page}>
    <Link className={styles.backLink} href="/cuadros"><ArrowLeft size={16} aria-hidden="true" /> Explorar diseños</Link>
    <div className={styles.pageHeading}><div><h1>Crear un cuadro en mosaico</h1><p>Elegí una foto que te guste y compará formatos y tamaños para tu cuadro.</p></div></div>
    {templateUnavailable && !source && <p role="alert" className={styles.error}>Ese diseño no está disponible. Podés elegir otro en el catálogo de cuadros o usar tu propia imagen.</p>}
    <div className={`${styles.workspace} ${design ? styles.activeWorkspace : ""}`}>
      <aside className={styles.controls} aria-label="Herramientas del creador">
        {options.length>1&&<fieldset className={styles.formatOptions}><legend>Formato de venecita</legend>{options.map(option=><label key={option.id}><input type="radio" name="tile-format" value={option.id} checked={active.id===option.id} disabled={loading} onChange={()=>{setSelectedFormat(option.id);setSize(current=>Math.max(option.config.minCells,Math.min(option.config.maxCells,Math.round((current-option.config.minCells)/option.config.step)*option.config.step+option.config.minCells)));setView("mosaic");}}/><span><strong>{option.id==='1x1'?'1×1':'2×2'}</strong><small>{option.id==='1x1'?'Piezas más pequeñas':'Piezas más grandes'}</small></span></label>)}</fieldset>}
        <section className={styles.controlSection}>
          <div className={styles.controlHeading}><h2>Tu imagen</h2><button className={styles.resetButton} onClick={reset} disabled={!source && !loading}><RotateCcw size={15} aria-hidden="true" /> Empezar de nuevo</button></div>
          <div data-testid="image-dropzone" className={styles.dropzone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void selectFile(e.dataTransfer.files[0]); }}>
            <label className={styles.uploadLabel}><ImagePlus size={22} aria-hidden="true" /><span>{loading ? "Preparando imagen…" : source ? "Cambiar imagen" : "Elegir una imagen"}</span>
              <input ref={input} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Elegir imagen" onChange={e => { void selectFile(e.target.files?.[0]); e.target.value = ""; }} />
            </label><p>También podés arrastrarla acá.<br />JPG, PNG o WebP · hasta 10 MB</p>
          </div>
          <p className={styles.hint}>Tu foto no se sube a internet. Si salís o recargás esta página, vas a perder el diseño.</p>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {source?.kind === "template" && <p className={styles.templateHint}>Elegiste «{source.template.title}». Probá los tamaños y formatos. Los colores se adaptan a las venecitas disponibles.</p>}
          {source?.kind === "image" && <div className={styles.cropTools}>
            <div className={styles.cropper} aria-label="Recortar imagen" inert={loading}>
              <Cropper image={source.image.url} crop={crop} zoom={zoom} aspect={1} onCropChange={value => { if (!loading) { setCrop(value); setView("mosaic"); } }} onZoomChange={value => { if (!loading) { setZoom(value); setView("mosaic"); } }} onCropComplete={(_, pixels) => { if (!loading) setArea(pixels); }} zoomWithScroll={false} keyboardStep={5} mediaProps={{ alt: "Tu imagen para recortar" }} />
            </div><p className={styles.hint}>Mové la foto hasta que quede como te gusta. También podés usar las flechas del teclado.</p>
            <label className={styles.rangeLabel} htmlFor="mosaic-zoom">Acercar imagen <span>{zoom.toFixed(1)}×</span></label>
            <input id="mosaic-zoom" disabled={loading} type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => { setZoom(Number(e.target.value)); setView("mosaic"); }} />
          </div>}
        </section>
        <section className={styles.controlSection}>
          <h2>Tamaño del mosaico</h2><label className={styles.rangeLabel} htmlFor="mosaic-size">Venecitas por lado {design && <output>{size} × {size}</output>}</label>
          <input id="mosaic-size" disabled={!design || loading} aria-label="Cantidad de venecitas por lado" type="range" min={config.minCells} max={config.maxCells} step={config.step} value={size} onChange={e => { const next = Number(e.target.value); if (next !== size) { setSize(next); setView("mosaic"); } }} />
          {design ? <><div className={styles.rangeEnds}><span>{config.minCells} · Menos detalle</span><span>{config.maxCells} · Más detalle</span></div>
          <p className={styles.dimensionText}>{cm(measures.framedMm)} × {cm(measures.framedMm)} cm <span>con marco negro</span></p>
          <p className={styles.hint}>Mosaico sin marco: {cm(measures.mosaicMm)} × {cm(measures.mosaicMm)} cm. Con más venecitas vas a ver más detalle y el cuadro será más grande.</p>
          <details className={styles.configDetails}><summary>Sobre las medidas</summary><p>El cálculo usa venecitas de {config.tileMm} mm, separadas por {config.groutMm} mm, y un marco de {config.frameMm} mm por lado. Las medidas definitivas todavía no están confirmadas.</p></details></> : <p className={styles.hint}>Subí una imagen para elegir el tamaño.</p>}
        </section>

      </aside>
      <section className={styles.previewColumn} aria-label="Vista previa del cuadro" aria-busy={loading}>
        <div className={styles.previewHeading}><h2>Así se vería tu cuadro</h2>{source?.kind === "image" && <div className={styles.viewSwitch} role="group" aria-label="Comparar imagen y mosaico"><button aria-pressed={view === "mosaic"} onClick={() => setView("mosaic")}>Mosaico</button><button aria-pressed={view === "source"} onClick={() => setView("source")}>Recorte</button></div>}</div>
        <div className={styles.previewWall}>
          {result?.error ? <p role="alert" className={styles.error}>{result.error}</p> : design ? <>
            {view === "source" && source?.kind === "image" ? <svg className={styles.previewArt} role="img" aria-label="Recorte de tu imagen" viewBox={`${area?.x ?? (source.image.raster.width - Math.min(source.image.raster.width, source.image.raster.height)) / 2} ${area?.y ?? (source.image.raster.height - Math.min(source.image.raster.width, source.image.raster.height)) / 2} ${area?.width ?? Math.min(source.image.raster.width, source.image.raster.height)} ${area?.height ?? Math.min(source.image.raster.width, source.image.raster.height)}`}><image href={source.image.url} width={source.image.raster.width} height={source.image.raster.height} /></svg> : <MosaicSvg design={design} label={`Tu mosaico de ${size} por ${size} venecitas`} className={styles.previewArt} />}
            <span className={styles.previewCaption}>{view === "source" ? "Recorte de tu imagen" : COLOR_VARIATION_NOTICE}</span>
          </> : <div className={styles.emptyPreview}><ImageIcon size={42} strokeWidth={1} aria-hidden="true" /><h3>Probá con tu foto</h3><p>Subila y mirá cómo quedaría en venecitas.</p><button className={styles.primaryButton} onClick={() => input.current?.click()}>Elegir imagen</button></div>}
        </div>
      </section>
    </div>
    {design && <section className={styles.creatorSummary} aria-label="Tu cuadro y su precio">
        <div className={styles.previewStats} aria-live="polite"><div><strong>{cm(measures.framedMm)} cm</strong><span>por lado, con marco</span></div><div><strong>{size ** 2}</strong><span>venecitas enteras</span></div><div><strong>{counts.length || "—"}</strong><span>colores utilizados</span></div></div>
        <section className={styles.estimateCard} aria-label={estimate.provisional?"Cotización estimada":"Precio del cuadro"}>
          <div><h3 className={styles.estimateLabel}>{estimate.provisional?"Precio estimado":"Precio del cuadro"} · ARS</h3><p className={styles.estimateAmount} aria-label={estimate.provisional?"Precio estimado del cuadro":"Precio del cuadro"}>{formatArs(estimate.totalCents)}</p><p className={styles.shippingPending}>Incluye marco negro. El envío se calcula después.</p></div>
          <button ref={reviewButton} className={styles.primaryButton} disabled={!design || loading} onClick={() => setReviewing(true)}>Revisar mi cuadro <ArrowRight size={18} aria-hidden="true" /></button>
          {estimate.provisional&&<p className={styles.estimateHint}>El precio es orientativo y se confirma antes de comprar.</p>}
        </section>
        {counts.length > 0 && <div className={styles.paletteLegend} aria-label="Colores del cuadro">{counts.map(c => <span key={c.id}><i className={styles.swatch} style={{ backgroundColor: c.hex }} aria-hidden="true" />{c.name}</span>)}</div>}
      </section>}

  </div>;
}
