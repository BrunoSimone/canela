"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Maximize, Minus, Plus, Redo2, RotateCcw, Undo2 } from "lucide-react";
import { dimensions, type MosaicDesign } from "../domain/design";
import type { RetouchHistory } from "../domain/retouches";
import { artSide, centerTile, fittedView, MosaicGestures, tileAt, zoomAt, type Viewport } from "./mosaic-navigation";
import { MosaicSvg } from "./mosaic-svg";
import styles from "./tile-editor.module.css";

type Props = {
  design: MosaicDesign; history: RetouchHistory;
  onPaint: (index: number, color: string) => void; onRestore: (index: number) => void;
  onUndo: () => void; onRedo: () => void; onClose: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
};

export function TileEditor({ design, history, onPaint, onRestore, onUndo, onRedo, onClose, returnFocus }: Props) {
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const palette = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ width: 1, height: 1 });
  const [view, setView] = useState(fittedView);
  const gestures = useRef(new MosaicGestures({ width: 1, height: 1 }));
  const frame = useRef<number | null>(null);

  function renderView() {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => { frame.current = null; setView({ ...gestures.current.view }); });
  }
  useEffect(() => {
    const node = stage; if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
      gestures.current.resize(next); setViewport(next); setView({ ...gestures.current.view });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    const wheel = (event: WheelEvent) => {
      event.preventDefault(); if (gestures.current.active) return;
      const rect = node.getBoundingClientRect(); const controller = gestures.current;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      controller.setView(zoomAt(controller.view, controller.view.scale * Math.exp(-Math.max(-200, Math.min(200, delta)) * .003), { x: event.clientX - rect.left, y: event.clientY - rect.top }, controller.viewport));
      renderView();
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => { observer.disconnect(); node.removeEventListener("wheel", wheel); if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; };
  }, [stage]);

  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function end(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const tap = gestures.current.up(event.pointerId, point(event), cancelled);
    if (tap) { const index = tileAt(tap, gestures.current.view, gestures.current.viewport, design.config, design.size); if (index !== null) setSelected(index); }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    renderView();
  }
  function zoom(factor: number) {
    const controller = gestures.current;
    controller.setView(zoomAt(controller.view, controller.view.scale * factor, { x: viewport.width / 2, y: viewport.height / 2 }, viewport));
    if (selected !== null) controller.setView(centerTile(selected, controller.view, viewport, design.config, design.size));
    setView({ ...controller.view });
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    const index = selected ?? 0, row = Math.floor(index / design.size), col = index % design.size;
    let next = index;
    if (event.key === "ArrowRight") next = row * design.size + Math.min(design.size - 1, col + (selected === null ? 0 : 1));
    else if (event.key === "ArrowLeft") next = row * design.size + Math.max(0, col - 1);
    else if (event.key === "ArrowDown") next = Math.min(design.size - 1, row + (selected === null ? 0 : 1)) * design.size + col;
    else if (event.key === "ArrowUp") next = Math.max(0, row - 1) * design.size + col;
    else if (event.key === "Home") next = row * design.size;
    else if (event.key === "End") next = (row + 1) * design.size - 1;
    else if (event.key === "Enter" && selected !== null) { event.preventDefault(); palette.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus(); return; }
    else return;
    event.preventDefault(); setSelected(next);
    gestures.current.setView(centerTile(next, gestures.current.view, viewport, design.config, design.size)); setView({ ...gestures.current.view });
  }
  const side = artSide(viewport), { framedMm } = dimensions(design.config, design.size);
  const { frameMm, tileMm, groutMm } = design.config;
  const color = selected === null ? null : design.config.palette.find(c => c.id === design.cells[selected]);
  const changed = Object.keys(history.present).length;
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Backdrop className={styles.backdrop} />
      <Dialog.Popup className={styles.editor} initialFocus={title} finalFocus={returnFocus} onKeyDown={event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) onRedo(); else onUndo(); }
      }}>
        <header className={styles.header}><div><Dialog.Title ref={title} tabIndex={-1}>Retocar venecitas</Dialog.Title><Dialog.Description>Los pequeños detalles hacen tu cuadro.</Dialog.Description></div><button className={styles.done} onClick={onClose}><Check size={18} aria-hidden="true" /> Listo</button></header>
        <div className={styles.toolbar}>
          <div className={styles.buttonGroup}><button aria-label="Deshacer retoque" title="Deshacer (Ctrl/⌘ Z)" disabled={!history.past.length} onClick={onUndo}><Undo2 size={19} aria-hidden="true" /></button><button aria-label="Rehacer retoque" title="Rehacer (Ctrl/⌘ Shift Z)" disabled={!history.future.length} onClick={onRedo}><Redo2 size={19} aria-hidden="true" /></button><span className={styles.count}>{changed ? `${changed} ${changed === 1 ? "retoque" : "retoques"}` : "Sin retoques"}</span></div>
          <div className={styles.buttonGroup}><button aria-label="Alejar mosaico" disabled={view.scale <= 1} onClick={() => zoom(1 / 1.5)}><Minus size={19} aria-hidden="true" /></button><output aria-label="Zoom del mosaico">{Math.round(view.scale * 100)}%</output><button aria-label="Acercar mosaico" disabled={view.scale >= 8} onClick={() => zoom(1.5)}><Plus size={19} aria-hidden="true" /></button><button aria-label="Ver cuadro completo" title="Ver cuadro completo" onClick={() => { gestures.current.setView(fittedView()); setView(fittedView()); }}><Maximize size={18} aria-hidden="true" /></button></div>
        </div>
        <div className={styles.workbench}>
          <div className={styles.canvasColumn}>
            <div ref={setStage} className={styles.stage} role="group" aria-label="Mosaico editable" aria-describedby={helpId} tabIndex={0} onKeyDown={keyboard}
              onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture?.(event.pointerId); gestures.current.down(event.pointerId, point(event)); }}
              onPointerMove={event => { gestures.current.move(event.pointerId, point(event)); if (gestures.current.active) renderView(); }}
              onPointerUp={event => end(event)} onPointerCancel={event => end(event, true)} onLostPointerCapture={event => end(event, true)}>
              <div className={styles.art} style={{ width: side * view.scale, height: side * view.scale, transform: `translate(${viewport.width / 2 + view.x - side * view.scale / 2}px, ${viewport.height / 2 + view.y - side * view.scale / 2}px)` }}>
                <MosaicSvg design={design} label="Cuadro en edición" />
                {selected !== null && <svg className={styles.selection} viewBox={`0 0 ${framedMm} ${framedMm}`} aria-hidden="true"><g fill="none" vectorEffect="non-scaling-stroke">{["#fff", "#34261e"].map((stroke, i) => <rect key={stroke} x={frameMm + selected % design.size * (tileMm + groutMm)} y={frameMm + Math.floor(selected / design.size) * (tileMm + groutMm)} width={tileMm} height={tileMm} stroke={stroke} strokeWidth={i ? 1.5 : 4.5} vectorEffect="non-scaling-stroke" />)}</g></svg>}
              </div>
            </div>
            <p className={styles.help} id={helpId}><span>Tocá una pieza · Arrastrá para mover · Pellizcá para ampliar</span><span className={styles.keyboardHelp}>Con teclado: flechas para elegir, Enter para ir al color.</span></p>
          </div>
          <aside className={styles.palettePanel} aria-label="Colores para la venecita">
            <div className={styles.selectionInfo}><div role="status" aria-label="Venecita seleccionada" aria-live="polite"><h3>{selected === null ? "Elegí una venecita" : `Fila ${Math.floor(selected / design.size) + 1} · Columna ${selected % design.size + 1}`}</h3><p>{color ? color.name : "Después, tocá un color para cambiarla."}</p></div><button className={styles.restore} aria-label="Restaurar color de esta venecita" title="Restaurar color generado" disabled={selected === null || history.present[selected] === undefined} onClick={() => { if (selected !== null) onRestore(selected); }}><RotateCcw size={17} aria-hidden="true" /><span>Restaurar</span></button></div>
            <div className={styles.palette} ref={palette} role="group" aria-label="Paleta de venecitas">{design.config.palette.map(c => <button key={c.id} aria-label={`Usar color ${c.name}`} title={c.name} aria-pressed={color?.id === c.id} disabled={selected === null} onClick={() => { if (selected !== null) onPaint(selected, c.id); }}><span style={{ backgroundColor: c.hex }} /></button>)}</div>
            <p className={styles.paletteHint}>Colores y acabado orientativos · Los tonos transparentes cambian según la base. Podés volver atrás con Deshacer.</p>
          </aside>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function ConfirmRegeneration({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <Dialog.Root open onOpenChange={open => { if (!open) onCancel(); }}><Dialog.Portal><Dialog.Backdrop className={styles.backdrop} /><Dialog.Popup className={styles.confirm} initialFocus={cancel}>
    <Dialog.Title>¿Volver a generar el mosaico?</Dialog.Title><Dialog.Description>{message} Los retoques por pieza se perderán.</Dialog.Description>
    <div className={styles.confirmActions}><button ref={cancel} onClick={onCancel}>Conservar retoques</button><button className={styles.done} onClick={onConfirm}>Continuar y regenerar</button></div>
  </Dialog.Popup></Dialog.Portal></Dialog.Root>;
}
