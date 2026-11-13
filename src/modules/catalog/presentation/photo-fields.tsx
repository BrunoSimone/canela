"use client";
import { useEffect, useRef, useState } from "react";
import { imageReferenceKey, type CatalogImage } from "../domain/editor";
import styles from "./catalog-panel.module.css";
export type ImagePreview = {
  assetId: string;
  url: string;
  width: number;
  height: number;
};
async function upload(file: File, signal: AbortSignal): Promise<ImagePreview> {
  if (
    file.size > 32 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw Error("Elegí una foto JPG, PNG o WebP de hasta 32 MB.");
  const hash = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const post = async (body: unknown) => {
    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error ?? "No pudimos cargar la foto.");
    return data;
  };
  const started = await post({
    action: "begin",
    hash,
    bytes: file.size,
    contentType: file.type,
  });
  const sent = await fetch(started.url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "private, no-store",
    },
    body: file,
    signal,
  });
  if (!sent.ok)
    throw Error("La carga no llegó al almacenamiento. Volvé a intentar.");
  return post({ action: "finish", id: started.id });
}
export function PhotoFields({
  photos,
  previews,
  onChange,
  onPreview,
  single = false,
  disabled = false,
  onBusy,
}: {
  photos: CatalogImage[];
  previews: Record<string, ImagePreview>;
  onChange: (photos: CatalogImage[]) => void;
  onPreview: (preview: ImagePreview) => void;
  single?: boolean;
  disabled?: boolean;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const update = (index: number, edit: Partial<CatalogImage>) =>
    onChange(photos.map((p, i) => (i === index ? { ...p, ...edit } : p)));
  async function select(files: FileList | null) {
    if (!files?.length || busy) return;
    const chosen = Array.from(files);
    if (photos.length + chosen.length > (single ? 1 : 20)) {
      setError(
        single
          ? "Quitá la foto actual para reemplazarla."
          : "Podés cargar hasta 20 fotos por producto.",
      );
      return;
    }
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    onBusy?.(true);
    setError("");
    let next = [...photos];
    try {
      for (const [i, file] of chosen.entries()) {
        setProgress(`Subiendo foto ${i + 1} de ${chosen.length}…`);
        const preview = await upload(file, abort.signal);
        onPreview(preview);
        next = [...next, { assetId: preview.assetId }];
        onChange(next);
      }
      setProgress(
        "Fotos cargadas. Guardá la ficha para conservar estos cambios.",
      );
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "No pudimos cargar la foto.");
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <fieldset disabled={busy || disabled}>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {progress && <p role="status">{progress}</p>}
      <div className={styles.photos}>
        {photos.map((photo, i) => (
          <div className={styles.photo} key={`${photo.assetId}-${i}`}>
            {/* Source comes from the authenticated media API, never an arbitrary URL field. */}
                        {(previews[imageReferenceKey(photo)] ?? previews[photo.assetId]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  (previews[imageReferenceKey(photo)] ??
                    previews[photo.assetId])?.url
                }
                alt={photo.alt || `Foto ${i + 1}`}
                style={{
                  objectPosition: `${(photo.hotspot?.x ?? 0.5) * 100}% ${(photo.hotspot?.y ?? 0.5) * 100}%`,
                }}
              />
            ) : (
              <div className={styles.placeholder}>Foto cargada</div>
            )}
            <div className={styles.photoActions}>
              {!single && (
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...photos];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    onChange(next);
                  }}
                  aria-label={`Mover foto ${i + 1} antes`}
                >
                  Mover antes
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, n) => n !== i))}
                aria-label={`Quitar foto ${i + 1}`}
              >
                Quitar
              </button>
            </div>
            <label>
              Descripción de la foto <small>Opcional</small>
              <input
                maxLength={180}
                value={photo.alt ?? ""}
                onChange={(e) => update(i, { alt: e.target.value })}
              />
            </label>
            <details>
              <summary>Ajustar recorte y encuadre</summary>
              <p>
                Porcentaje que se recorta de cada borde. El original se
                conserva. El cambio se aplica al guardar.
              </p>
              <div className={styles.grid}>
                {(["top", "bottom", "left", "right"] as const).map((side) => (
                  <label key={side}>
                    {
                      {
                        top: "Arriba",
                        bottom: "Abajo",
                        left: "Izquierda",
                        right: "Derecha",
                      }[side]
                    }{" "}
                    (%)
                    <input
                      type="number"
                      min="0"
                      max="90"
                      step="1"
                      value={Math.round((photo.crop?.[side] ?? 0) * 100)}
                      onChange={(e) =>
                        update(i, {
                          crop: {
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                            ...photo.crop,
                            [side]: Number(e.target.value) / 100,
                          },
                        })
                      }
                    />
                  </label>
                ))}
                {(["x", "y"] as const).map((axis) => (
                  <label key={axis}>
                    Punto de interés {axis === "x" ? "horizontal" : "vertical"}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={(photo.hotspot?.[axis] ?? 0.5) * 100}
                      onChange={(e) =>
                        update(i, {
                          hotspot: {
                            x: 0.5,
                            y: 0.5,
                            width: 1,
                            height: 1,
                            ...photo.hotspot,
                            [axis]: Number(e.target.value) / 100,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
          </div>
        ))}
      </div>
      {photos.length < (single ? 1 : 20) && (
        <label className={styles.upload}>
          {busy ? "Cargando fotos…" : "Agregar fotos"}
          <small>
            JPG, PNG o WebP. Hasta 32 MB por foto. La primera será la portada.
          </small>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple={!single}
            onChange={(e) => {
              void select(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </fieldset>
  );
}
